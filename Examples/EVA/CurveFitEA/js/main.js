// CurveFitEA — vstupní bod: propojení UI, stavu evoluce a hlavní smyčky.
//
// Evoluční parametry (stupeň, fitness metrika, selekce, křížení, mutace,
// elitismus, náhrada generace) se čtou přímo z ovládacích prvků při každém
// kroku (viz readParamsFromUI) — žádný duplicitní stav, jeden zdroj pravdy.
// Body a populace jsou samostatný stav: úprava bodů myší nevyžaduje restart
// populace (fitness se přepočítá při každém překreslení, viz redraw()),
// změna stupně polynomu naopak restart populace vyžaduje (mění délku
// genomu/počet koeficientů) — ale body zůstávají (viz resetPopulationOnly()).

var canvas = document.getElementById('sim-canvas');
var ctx = canvas.getContext('2d');

// --- Stav evoluce (mění se resetem, krokem generace, ruční úpravou bodů) ---

var points = [];
var population = [];
var worldConfig = { yMin: -1, yMax: 1 };
var rng;
var generationCount = 0;
var isRunning = false;
var runIntervalId = null;

// --- Zvýrazněná křivka (hover/pin, spec bod 2) ------------------------------
//
// hoveredCurveIndex sleduje pohyb myši a maže se při opuštění plochy;
// pinnedCurveIndex "přichytí" zobrazení klikem, ať jde vidět i bez podržení
// myši (spec: "klik může navíc přichytit zobrazení"). Efektivně zvýrazněná
// křivka je pin, pokud existuje, jinak hover — viz highlightedCurveIndex().
var hoveredCurveIndex = null;
var pinnedCurveIndex = null;
var lastCurveSamples = [];
var lastHighlightedSumOfSquares = null;
var lastCursorWorld = null; // world souřadnice pod kurzorem, nebo null mimo plochu

// --- Historie nejlepších jedinců (spec bod 3) -------------------------------
//
// Stopa nejlepšího jedince z každé generace od posledního resetu — čistě
// vizuální doplněk (viz drawHistoryTrail v render.js), na evoluci samotnou
// nemá žádný vliv. Kapacita omezená (na rozdíl od "generace" v EvoMice
// fitness grafu, kde stačí čísla — tady jde o celé vektory koeficientů a
// vykreslují se všechny najednou, neomezené pole by časem zpomalovalo
// překreslení i zahlcovalo obrazovku prakticky neviditelnými starými
// křivkami) — po překročení meze nejstarší záznamy odpadávají (efekt
// "blednutí do minulosti" tím není narušen, jen strop na to, jak daleko do
// minulosti stopa sahá).
var HISTORY_MAX_LENGTH = 150;
var bestHistory = [];

function clearBestHistory() {
  bestHistory = [];
}

function recordBestToHistory(bestIndividual) {
  if (bestIndividual === null) {
    return;
  }
  bestHistory.push(bestIndividual.coeffs.slice());
  if (bestHistory.length > HISTORY_MAX_LENGTH) {
    bestHistory.shift();
  }
}

function isHistoryVisible() {
  return document.getElementById('history-toggle-checkbox').checked;
}

function highlightedCurveIndex() {
  if (pinnedCurveIndex !== null) {
    return pinnedCurveIndex;
  }
  return hoveredCurveIndex;
}

// Populace po kroku evoluce/resetu/změně velikosti dostane nové jedince —
// index zvýrazněné křivky by pak ukazoval na "někoho jiného", proto se
// pin/hover při každé takové změně zruší.
function clearCurveHighlight() {
  hoveredCurveIndex = null;
  pinnedCurveIndex = null;
}

function togglePinnedCurve(index) {
  if (pinnedCurveIndex === index) {
    pinnedCurveIndex = null;
  } else {
    pinnedCurveIndex = index;
  }
}

// --- Vykreslení a informační řádky ------------------------------------------

function redraw() {
  var fitnessType = document.getElementById('fitness-type-select').value;
  var fitnessTolerance = Number(document.getElementById('fitness-tolerance-slider').value);
  computeFitness(population, points, fitnessType, fitnessTolerance); // vždy čerstvé vůči aktuálním bodům

  var historyToShow = isHistoryVisible() ? bestHistory : [];
  var result = drawScene(ctx, population, points, worldConfig, highlightedCurveIndex(), historyToShow);
  lastCurveSamples = result.curveSamples;
  lastHighlightedSumOfSquares = result.highlightedSumOfSquares;

  updateStatsLine(fitnessType);
  updateCursorPositionLine();
  updateHighlightedCurveLine();
}

function findBestIndividual() {
  if (population.length === 0) {
    return null;
  }
  var best = population[0];
  var i = 1;
  while (i < population.length) {
    if (population[i].fitness > best.fitness) {
      best = population[i];
    }
    i = i + 1;
  }
  return best;
}

var FITNESS_TYPE_LABEL_KEYS = {
  sse: 'fitness_sse',
  mae: 'fitness_mae',
  'max-error': 'fitness_max_error',
  'hit-count': 'fitness_hit_count'
};

function updateStatsLine(fitnessType) {
  var statsEl = document.getElementById('stats-line');
  var best = findBestIndividual();
  var metricLabel = t(FITNESS_TYPE_LABEL_KEYS[fitnessType] || 'fitness_sse');
  // 'hit-count' ukládá jako "chybu" počet NEtrefených bodů (viz computeError
  // v model.js) — čitelnější je ukázat přímo počet trefených bodů.
  var bestErrorText = '—';
  if (best !== null) {
    bestErrorText = fitnessType === 'hit-count'
      ? t('stats_hit_count_value', { hits: points.length - best.error, total: points.length })
      : best.error.toFixed(3);
  }
  var line = t('stats_line', { gen: generationCount, metric: metricLabel, error: bestErrorText });
  // Spec 6: když je stupeň součástí genomu, nejlepší jedinec z různých
  // generací může mít různý stupeň — ukaž ho, ať jde over/underfitting
  // pozorovat i v textu, ne jen na tvaru křivky.
  if (isDegreeEvolving() && best !== null) {
    line = line + ' ' + t('stats_degree_suffix', { degree: best.coeffs.length - 1 });
  }
  statsEl.textContent = line;
}

function updateCursorPositionLine() {
  var el = document.getElementById('cursor-position-line');
  if (lastCursorWorld === null) {
    el.textContent = t('cursor_position_none');
    return;
  }
  el.textContent = t('cursor_position_label', {
    x: lastCursorWorld.x.toFixed(2),
    y: lastCursorWorld.y.toFixed(2)
  });
}

function updateHighlightedCurveLine() {
  var el = document.getElementById('highlighted-curve-line');
  if (highlightedCurveIndex() === null) {
    el.textContent = t('highlighted_curve_none');
    return;
  }
  el.textContent = t('highlighted_curve_label', { sse: lastHighlightedSumOfSquares.toFixed(3) });
}

// --- Čtení evolučních parametrů z UI ---------------------------------------

function readParamsFromUI() {
  var params = createDefaultGaParams();

  params.degree = Number(document.getElementById('degree-slider').value);
  params.degreeEvolves = isDegreeEvolving();
  params.degreeMutationRate = Number(document.getElementById('degree-mutation-rate-slider').value);
  params.fitnessType = document.getElementById('fitness-type-select').value;
  params.fitnessTolerance = Number(document.getElementById('fitness-tolerance-slider').value);

  params.genomeTransform = document.getElementById('genome-transform-select').value;
  params.genomeNumeric = document.getElementById('genome-numeric-select').value;
  params.genomeFixedBits = Number(document.getElementById('genome-fixed-bits-slider').value);

  params.selectionMethod = document.getElementById('selection-method-select').value;
  params.tournamentSize = Number(document.getElementById('tournament-size-slider').value);

  params.crossoverRate = Number(document.getElementById('crossover-rate-slider').value);
  params.crossoverType = document.getElementById('crossover-type-select').value;
  params.crossoverPoints = Number(document.getElementById('crossover-points-slider').value);

  params.mutationType = document.getElementById('mutation-type-select').value;
  params.mutationRate = Number(document.getElementById('mutation-rate-slider').value);
  params.mutationSigma = Number(document.getElementById('mutation-sigma-slider').value);

  params.eliteCount = Number(document.getElementById('elite-count-slider').value);

  params.replacementMode = document.getElementById('replacement-mode-select').value;
  params.replacementPercent = Number(document.getElementById('replacement-percent-slider').value);

  return params;
}

// --- Velikost canvasu: co největší čtverec z dostupného místa (spec 14.2) -
//
// Stejný princip jako EvoMice: CANVAS_PIXEL_SIZE (js/render.js) se
// dopočítává z reálné velikosti #canvas-area (grid/flex layout, viz
// style.css), ne z pevné konstanty, ať plocha nikdy nepřeteče a je vždy co
// největší dostupný čtverec.
var CANVAS_AREA_RESERVE = 8; // malá rezerva na okraj #canvas-container

function isFullscreenActive() {
  return document.getElementById('simulation-wrapper').classList.contains('is-fullscreen');
}

function updateCanvasSize() {
  var canvasArea = document.getElementById('canvas-area');
  var availableWidth = canvasArea.clientWidth - CANVAS_AREA_RESERVE;
  var availableHeight = canvasArea.clientHeight - CANVAS_AREA_RESERVE;
  updateCanvasPixelSize(canvas, availableWidth, availableHeight);
}

window.addEventListener('resize', function () {
  updateCanvasSize();
  redraw();
});

// --- Reset / inicializace -------------------------------------------------

// Regeneruje ÚPLNĚ VŠECHNO ze zadaného seedu: nová sada bodů ze skrytého
// referenčního modelu (spec bod 2) i nová náhodná populace (analogie
// EvoMice "Nová náhodná populace (reset)").
function resetEverything() {
  var seedValue = Number(document.getElementById('seed-input').value);
  rng = createRng(seedValue);

  points = generateInitialPoints(rng);
  worldConfig = computeWorldYRange(points);
  updateCanvasSize();

  resetPopulationOnly();
}

// Restartuje jen populaci (nová náhodná populace daného stupně) — body
// zůstávají beze změny. Používá se po resetEverything() i po změně stupně
// polynomu (viz PROGRESS.md — změna stupně nemá smysl mazat uživatelovu
// ruční úpravu bodů).
function isDegreeEvolving() {
  return document.getElementById('degree-evolves-checkbox').checked;
}

function resetPopulationOnly() {
  var degree = Number(document.getElementById('degree-slider').value);
  var populationSize = Number(document.getElementById('population-size-slider').value);
  var coeffRange = computeCoeffRange(points);

  population = createRandomPopulation(populationSize, degree, coeffRange, rng, isDegreeEvolving());
  generationCount = 0;
  clearCurveHighlight();
  clearBestHistory();
  redraw();
}

document.getElementById('reset-btn').addEventListener('click', function () {
  stopRunning();
  resetEverything();
});

document.getElementById('degree-slider').addEventListener('change', function () {
  // Stupeň polynomu mění počet koeficientů (délku genomu) — vyžaduje
  // restart populace, nejde jen "dopočítat" existující jedince. (Když je
  // degreeEvolves zapnuté, degree-slider je STROP, viz spec 6 — i tak má
  // změna smysl jen po restartu populace.)
  stopRunning();
  resetPopulationOnly();
});

// Spec 6: přepnutí "stupeň je součást genomu" mění tvar celé populace
// (pevná délka koeficientů -> proměnlivá a naopak) — stejný důvod restartu
// jako u samotné změny stupně výš.
document.getElementById('degree-evolves-checkbox').addEventListener('change', function () {
  stopRunning();
  resetPopulationOnly();
});

function adjustPopulationSize() {
  var targetSize = Number(document.getElementById('population-size-slider').value);
  var degree = Number(document.getElementById('degree-slider').value);
  var coeffRange = computeCoeffRange(points);
  var degreeEvolves = isDegreeEvolving();

  if (targetSize > population.length) {
    var toAdd = targetSize - population.length;
    var i = 0;
    while (i < toAdd) {
      population.push(
        degreeEvolves
          ? createRandomIndividualVariableDegree(degree, coeffRange, rng)
          : createRandomIndividual(degree, coeffRange, rng)
      );
      i = i + 1;
    }
  } else {
    while (population.length > targetSize) {
      population.pop();
    }
  }

  clearCurveHighlight();
  redraw();
}

document.getElementById('population-size-slider').addEventListener('change', adjustPopulationSize);

// --- Populace = 1: deaktivace irelevantních ovládacích prvků (stejná ------
// konvence jako EvoMice 13.4) -----------------------------------------------
var POPULATION_SIZE_DEPENDENT_CONTROL_IDS = [
  'crossover-rate-slider',
  'crossover-type-select',
  'crossover-points-slider',
  'tournament-size-slider'
];

function updatePopulationSizeDependentControls() {
  var targetSize = Number(document.getElementById('population-size-slider').value);
  var singleIndividual = targetSize <= 1;
  var i = 0;
  while (i < POPULATION_SIZE_DEPENDENT_CONTROL_IDS.length) {
    document.getElementById(POPULATION_SIZE_DEPENDENT_CONTROL_IDS[i]).disabled = singleIndividual;
    i = i + 1;
  }
}

document.getElementById('population-size-slider').addEventListener('input', updatePopulationSizeDependentControls);

// --- Podmíněné zobrazení parametrů vázaných na konkrétní volbu (stejná ----
// konvence jako EvoMice 13.8) — podporuje jak ovládací prvky vázané na
// hodnotu <select> (data-show-when-select/-value), tak na stav checkboxu
// (data-show-when-checkbox/-checked, spec 6: slider míry mutace stupně
// vázaný na "stupeň je součást genomu"). ------------------------------------
var CONDITIONAL_CONTROL_LABELS = document.querySelectorAll('[data-show-when-select], [data-show-when-checkbox]');

function updateConditionalControlsVisibility() {
  var i = 0;
  while (i < CONDITIONAL_CONTROL_LABELS.length) {
    var label = CONDITIONAL_CONTROL_LABELS[i];
    var visible;

    var selectId = label.getAttribute('data-show-when-select');
    if (selectId !== null) {
      var controllingSelect = document.getElementById(selectId);
      var requiredValue = label.getAttribute('data-show-when-value');
      visible = controllingSelect.value === requiredValue;
    } else {
      var checkboxId = label.getAttribute('data-show-when-checkbox');
      var controllingCheckbox = document.getElementById(checkboxId);
      var requiredChecked = label.getAttribute('data-show-when-checked') !== 'false'; // výchozí 'true'
      visible = controllingCheckbox.checked === requiredChecked;
    }

    label.style.display = visible ? '' : 'none';
    i = i + 1;
  }
}

var conditionalControlSelectIds = [
  'selection-method-select', 'crossover-type-select', 'mutation-type-select', 'replacement-mode-select',
  'fitness-type-select', 'genome-numeric-select'
];
var conditionalSelectIndex = 0;
while (conditionalSelectIndex < conditionalControlSelectIds.length) {
  document.getElementById(conditionalControlSelectIds[conditionalSelectIndex])
    .addEventListener('change', updateConditionalControlsVisibility);
  conditionalSelectIndex = conditionalSelectIndex + 1;
}

document.getElementById('degree-evolves-checkbox').addEventListener('change', updateConditionalControlsVisibility);

document.getElementById('fitness-type-select').addEventListener('change', redraw);
document.getElementById('history-toggle-checkbox').addEventListener('change', redraw);

// --- Krok evoluce (jedna generace) -----------------------------------

function stepOnce() {
  var params = readParamsFromUI();
  recordBestToHistory(findBestIndividual()); // stopa PŘED krokem — poslední generace se zapíše do historie, teprve pak vznikne nová
  population = stepGeneration(population, points, params, rng);
  generationCount = generationCount + 1;
  clearCurveHighlight(); // jedinci v nové generaci jsou jiní, staré indexy by mátly
  redraw();
}

// --- Běh (start/pauza/rychlost) ----------------------------------------

function scheduleNextTick() {
  if (runIntervalId !== null) {
    clearInterval(runIntervalId);
  }
  var speed = Number(document.getElementById('speed-slider').value); // generací za sekundu
  var intervalMs = Math.round(1000 / speed);
  runIntervalId = setInterval(stepOnce, intervalMs);
}

function updateStartPauseButtonText() {
  var button = document.getElementById('start-pause-btn');
  button.textContent = isRunning ? t('pause_btn') : t('start_btn');
}

function startRunning() {
  if (isRunning) {
    return;
  }
  var speed = Number(document.getElementById('speed-slider').value);
  if (speed === 0) {
    stepOnce(); // rychlost 0 nemá smysluplný interval, chová se jako jeden krok
    return;
  }
  isRunning = true;
  updateStartPauseButtonText();
  scheduleNextTick();
}

function stopRunning() {
  isRunning = false;
  updateStartPauseButtonText();
  if (runIntervalId !== null) {
    clearInterval(runIntervalId);
    runIntervalId = null;
  }
}

document.getElementById('start-pause-btn').addEventListener('click', function () {
  if (isRunning) {
    stopRunning();
  } else {
    startRunning();
  }
});

function isInteractiveElementFocused() {
  var focused = document.activeElement;
  if (focused === null) {
    return false;
  }
  var tagName = focused.tagName;
  return tagName === 'BUTTON' || tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA';
}

document.addEventListener('keydown', function (event) {
  if (event.code !== 'Space') {
    return;
  }
  if (isInteractiveElementFocused()) {
    return;
  }
  event.preventDefault();
  if (isRunning) {
    stopRunning();
  } else {
    startRunning();
  }
});

document.getElementById('step-btn').addEventListener('click', function () {
  stopRunning();
  stepOnce();
});

document.getElementById('speed-slider').addEventListener('input', function () {
  if (!isRunning) {
    return;
  }
  var speed = Number(document.getElementById('speed-slider').value);
  if (speed === 0) {
    stopRunning();
  } else {
    scheduleNextTick();
  }
});

// --- Pomocná funkce: napojí slider na textový "displej" jeho hodnoty ----
var SLIDER_DISPLAY_PAIRS = [
  ['speed-slider', 'speed-value'],
  ['degree-slider', 'degree-value'],
  ['population-size-slider', 'population-size-value'],
  ['tournament-size-slider', 'tournament-size-value'],
  ['crossover-rate-slider', 'crossover-rate-value'],
  ['crossover-points-slider', 'crossover-points-value'],
  ['mutation-rate-slider', 'mutation-rate-value'],
  ['mutation-sigma-slider', 'mutation-sigma-value'],
  ['replacement-percent-slider', 'replacement-percent-value'],
  ['elite-count-slider', 'elite-count-value'],
  ['fitness-tolerance-slider', 'fitness-tolerance-value'],
  ['genome-fixed-bits-slider', 'genome-fixed-bits-value'],
  ['degree-mutation-rate-slider', 'degree-mutation-rate-value']
];

function wireSliderDisplay(sliderId, displayId) {
  var slider = document.getElementById(sliderId);
  var display = document.getElementById(displayId);
  display.textContent = slider.value;
  slider.addEventListener('input', function () {
    display.textContent = slider.value;
  });
}

function refreshSliderDisplays() {
  var i = 0;
  while (i < SLIDER_DISPLAY_PAIRS.length) {
    var sliderId = SLIDER_DISPLAY_PAIRS[i][0];
    var displayId = SLIDER_DISPLAY_PAIRS[i][1];
    document.getElementById(displayId).textContent = document.getElementById(sliderId).value;
    i = i + 1;
  }
}

var sliderDisplayIndex = 0;
while (sliderDisplayIndex < SLIDER_DISPLAY_PAIRS.length) {
  wireSliderDisplay(SLIDER_DISPLAY_PAIRS[sliderDisplayIndex][0], SLIDER_DISPLAY_PAIRS[sliderDisplayIndex][1]);
  sliderDisplayIndex = sliderDisplayIndex + 1;
}

// --- Zoom ovládání --------------------------------------------------------
//
// Zoom (spec 14.2) škáluje jen #canvas-container (samotnou plochu), ne celý
// panel simulace — #canvas-area kolem něj má `overflow: auto` (style.css),
// takže přiblížení nad dostupné místo samo vyvolá posuvníky pro výřez.
var canvasContainerEl = document.getElementById('canvas-container');
var zoomSlider = document.getElementById('zoom-slider');
zoomSlider.addEventListener('input', function () {
  applyZoom(canvasContainerEl, Number(zoomSlider.value));
});

// --- Panning: tažení pravým tlačítkem myši posouvá přiblížený výřez -------
//
// Levé tlačítko je obsazené úpravou bodů (viz níže) — panning proto
// poslouchá pravé tlačítko (button === 2) a potlačuje kontextové menu
// prohlížeče na ploše, ať tažení nic nepřeruší (spec 14.2).
var canvasAreaEl = document.getElementById('canvas-area');
var isPanning = false;
var panLastClientX = 0;
var panLastClientY = 0;

canvasAreaEl.addEventListener('contextmenu', function (event) {
  event.preventDefault();
});

canvasAreaEl.addEventListener('mousedown', function (event) {
  if (event.button !== 2) {
    return;
  }
  isPanning = true;
  panLastClientX = event.clientX;
  panLastClientY = event.clientY;
});

window.addEventListener('mousemove', function (event) {
  if (!isPanning) {
    return;
  }
  canvasAreaEl.scrollLeft = canvasAreaEl.scrollLeft - (event.clientX - panLastClientX);
  canvasAreaEl.scrollTop = canvasAreaEl.scrollTop - (event.clientY - panLastClientY);
  panLastClientX = event.clientX;
  panLastClientY = event.clientY;
});

window.addEventListener('mouseup', function () {
  isPanning = false;
});

// --- Ruční úprava bodů + hover/klik na křivku (spec bod 2) -----------------
//
// Levé tlačítko: klik na volné místo přidá bod, klik na existující bod ho
// smaže, tažení existujícího bodu ho přesune. Klik na křivku (mimo bod)
// "přichytí" zvýraznění (viz togglePinnedCurve výš) — hover dělá totéž bez
// podržení tlačítka (viz canvas 'mousemove' posluchač níže).
//
// Rozlišení "klik" vs. "tažení": mousedown si zapamatuje, jestli je pod
// kurzorem bod, mousemove sleduje, jestli se kurzor posunul o víc než
// DRAG_MOVE_THRESHOLD_PX (js/input.js) — teprve pak jde o tažení, ne klik.
var pointDragState = null; // { pointIndex: number|null, moved: bool, startClientX, startClientY }

// Spec 2: souřadnice bodů jsou vždy přirozená čísla (celá, nezáporná) —
// platí stejně pro ruční úpravu myší jako pro počáteční náhodné rozhození
// (viz generateInitialPoints v model.js). Kurzor se tedy vždy "přichytí" na
// nejbližší celočíselný bod uvnitř viditelné plochy.
function clampWorldPoint(world) {
  return {
    x: Math.round(clampNumber(world.x, WORLD_X_MIN, WORLD_X_MAX)),
    y: Math.round(clampNumber(world.y, 0, worldConfig.yMax))
  };
}

canvas.addEventListener('mousedown', function (event) {
  if (event.button !== 0) {
    return; // pravé tlačítko je vyhrazené pro panning (viz výš)
  }
  var pixel = clientToCanvasPixel(canvas, event.clientX, event.clientY);
  var pointIndex = hitTestPoint(points, pixel, worldConfig);
  pointDragState = {
    pointIndex: pointIndex,
    moved: false,
    startClientX: event.clientX,
    startClientY: event.clientY
  };
});

window.addEventListener('mousemove', function (event) {
  if (pointDragState === null) {
    return;
  }
  var dx = event.clientX - pointDragState.startClientX;
  var dy = event.clientY - pointDragState.startClientY;
  if (!pointDragState.moved && Math.sqrt(dx * dx + dy * dy) >= DRAG_MOVE_THRESHOLD_PX) {
    pointDragState.moved = true;
  }
  if (pointDragState.moved && pointDragState.pointIndex !== null) {
    var pixel = clientToCanvasPixel(canvas, event.clientX, event.clientY);
    points[pointDragState.pointIndex] = clampWorldPoint(canvasPixelToWorld(pixel, worldConfig));
    redraw();
  }
});

window.addEventListener('mouseup', function (event) {
  if (pointDragState === null || event.button !== 0) {
    return;
  }

  if (pointDragState.pointIndex !== null) {
    if (!pointDragState.moved) {
      // Klik (beze pohybu) na existující bod: smaže ho.
      points.splice(pointDragState.pointIndex, 1);
    }
    // Jinak (tažení): pozice se už průběžně aktualizovala výš, nic dalšího netřeba.
  } else if (!pointDragState.moved) {
    // Klik na volné místo (mimo bod): buď zvýrazní/odzvýrazní křivku pod
    // kurzorem, nebo (mimo jakoukoliv křivku) přidá nový bod.
    var pixel = clientToCanvasPixel(canvas, event.clientX, event.clientY);
    var curveIndex = hitTestCurve(lastCurveSamples, pixel);
    if (curveIndex !== null) {
      togglePinnedCurve(curveIndex);
    } else {
      points.push(clampWorldPoint(canvasPixelToWorld(pixel, worldConfig)));
    }
  }
  // Tažení ze volného místa (bez zásahu bodu) nemá definovanou akci —
  // žádné "gumové lano" výběru, jen se nic nestane.

  pointDragState = null;
  redraw();
});

// Hover: nezávislé na tažení bodu (pokud zrovna netáhneme bod), sleduje
// nejbližší křivku pod kurzorem a souřadnice pro řádek pod plochou.
canvas.addEventListener('mousemove', function (event) {
  var pixel = clientToCanvasPixel(canvas, event.clientX, event.clientY);
  lastCursorWorld = canvasPixelToWorld(pixel, worldConfig);
  if (pointDragState === null || pointDragState.pointIndex === null) {
    hoveredCurveIndex = hitTestCurve(lastCurveSamples, pixel);
  }
  redraw();
});

canvas.addEventListener('mouseleave', function () {
  lastCursorWorld = null;
  hoveredCurveIndex = null;
  redraw();
});

// --- Fullscreen -------------------------------------------------------------
//
// Stejný princip jako EvoMice (spec 14.2): Fullscreen API požádaný na
// #simulation-wrapper (plocha + prostřední pruh), skutečný stav se zrcadlí
// do třídy .is-fullscreen (viz isFullscreenActive() výš) — ověřitelné i bez
// reálného uživatelského gesta (headless prohlížeč requestFullscreen()
// jinak odmítne, viz PROGRESS.md "Vizuální ověřování").
var fullscreenBtn = document.getElementById('fullscreen-btn');
var simulationWrapperEl = document.getElementById('simulation-wrapper');

function updateFullscreenButtonText() {
  fullscreenBtn.textContent = isFullscreenActive() ? t('fullscreen_exit_btn') : t('fullscreen_enter_btn');
}

fullscreenBtn.addEventListener('click', function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    simulationWrapperEl.requestFullscreen();
  }
});

document.addEventListener('fullscreenchange', function () {
  if (document.fullscreenElement !== null) {
    simulationWrapperEl.classList.add('is-fullscreen');
  } else {
    simulationWrapperEl.classList.remove('is-fullscreen');
  }
  updateFullscreenButtonText();
  updateCanvasSize();
  redraw();
});

// --- i18n: obnovení textů generovaných za běhu (mimo data-i18n) ------------
function onLanguageChanged() {
  updateStartPauseButtonText();
  updateFullscreenButtonText();
  redraw();
}

// --- Úvodní inicializace ------------------------------------------------
updateStartPauseButtonText();
updateFullscreenButtonText();
updatePopulationSizeDependentControls();
updateConditionalControlsVisibility();
// Skutečná první resetEverything() proběhne až v js/defaults.js
// (applyInitialSettings()) — tam se napřed aplikují DEFAULT_SETTINGS (jedno
// místo pravdy pro výchozí hodnoty), teprve pak dává smysl body/populaci
// vytvořit.
