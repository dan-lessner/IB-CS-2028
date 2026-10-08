// EvoMice — vstupní bod: propojení UI, stavu simulace a hlavní smyčky.
//
// Chování evolučních operátorů (fitness, selekce, křížení, mutace,
// elitismus, náhrada generace) se čte přímo z ovládacích prvků při každém
// kroku (viz readParamsFromUI) — žádný duplicitní stav, jeden zdroj pravdy.
// Strukturální věci (velikost mřížky, seed) vyžadují restart simulace,
// protože mění délku genomu / počáteční náhodnou řadu.

var canvas = document.getElementById('sim-canvas');
var ctx = canvas.getContext('2d');

var fitnessChartCanvas = document.getElementById('fitness-chart-canvas');
var fitnessChartCtx = fitnessChartCanvas.getContext('2d');

// --- Stav simulace (mění se resetem, krokem generace, ručním kreslením) ---

var gridConfig;
var population;
var foodList;
var rng;
var generationCount = 0;
var isRunning = false;
var runIntervalId = null;
// Výchozí stav přepínače v UI je "ruční kreslení" (spec 13.1) — HTML má
// odpovídající radio button rovnou 'checked', tahle proměnná to jen zrcadlí.
var foodMode = 'manual'; // 'random' | 'manual'

// --- Vykreslení a stavový řádek --------------------------------------------

// Aktuální kapacita krmení (spec 10.3) — čte se přímo ze slideru, ať platí
// stejně pro vykreslení, náhodné rozhození i ruční přikreslení jedné buňky.
function currentFoodCapacity() {
  return Number(document.getElementById('food-capacity-slider').value);
}

function redraw() {
  drawScene(ctx, canvas, gridConfig, population, foodList, currentFoodCapacity());
  updateStatsLine();
  updateCursorPositionLine(); // bakterie/krmení pod kurzorem se mění i beze pohybu kurzoru (další generace)
  drawFitnessChart(fitnessChartCtx, fitnessChartCanvas);
}

// Přepočítá fitness aktuální populace a přidá záznam do grafu (viz
// js/fitness-chart.js). Volá computeFitness() z ga.js přímo — nezávisle na
// tom, jestli zrovna proběhl krok evoluce — ať je graf vždy konzistentní s
// právě zobrazenou populací a aktuálním krmením.
function recordCurrentFitnessStats() {
  var fitnessType = document.getElementById('fitness-type-select').value;
  computeFitness(population, foodList, gridConfig, fitnessType);
  recordFitnessSnapshot(generationCount, population);
}

function updateStatsLine() {
  var statsEl = document.getElementById('stats-line');
  if (statsEl === null) {
    return;
  }
  var fedCount = 0;
  var i = 0;
  while (i < population.length) {
    if (isBacteriumFed(population[i], foodList)) {
      fedCount = fedCount + 1;
    }
    i = i + 1;
  }
  statsEl.textContent = t('stats_line', { gen: generationCount, fed: fedCount, total: population.length });
}

// --- Souřadnice kurzoru pod plochou -----------------------------------
//
// Nezávislé na režimu krmení (funguje i mimo ruční kreslení) — jen ukazuje,
// nad kterou buňkou mřížky je právě kurzor. Využívá canvasPositionToCell()
// z input.js, ať se přepočet klientských souřadnic na buňku nepíše dvakrát.

var lastCursorCell = null; // null = kurzor není nad plochou

// Kromě souřadnic doplní (spec 10.4) počet bakterií a množství krmení na
// dané buňce — ale jen když tam něco je, ať řádek nepůsobí zbytečně
// "upovídaně" u prázdných buněk.
function updateCursorPositionLine() {
  var el = document.getElementById('cursor-position-line');
  if (el === null) {
    return;
  }
  if (lastCursorCell === null) {
    el.textContent = t('cursor_position_none');
    return;
  }

  var x = lastCursorCell.x;
  var y = lastCursorCell.y;
  var text = t('cursor_position_label', { x: x, y: y });

  var bacteriaCount = countBacteriaOnCell(x, y, population);
  if (bacteriaCount > 0) {
    text = text + t('cursor_bacteria_segment', { count: bacteriaCount });
  }

  var foodAmount = foodAmountOnCell(x, y, foodList);
  if (foodAmount > 0) {
    text = text + t('cursor_food_segment', { amount: foodAmount, capacity: currentFoodCapacity() });
  }

  el.textContent = text;
}

canvas.addEventListener('mousemove', function (event) {
  lastCursorCell = canvasPositionToCell(canvas, gridConfig, event.clientX, event.clientY);
  updateCursorPositionLine();
});

canvas.addEventListener('mouseleave', function () {
  lastCursorCell = null;
  updateCursorPositionLine();
});

// --- Čtení evolučních parametrů z UI ---------------------------------------

function readParamsFromUI() {
  var params = createDefaultGaParams();

  params.fitnessType = document.getElementById('fitness-type-select').value;

  params.selectionMethod = document.getElementById('selection-method-select').value;
  params.tournamentSize = Number(document.getElementById('tournament-size-slider').value);

  params.crossoverRate = Number(document.getElementById('crossover-rate-slider').value);
  params.crossoverType = document.getElementById('crossover-type-select').value;
  params.crossoverPoints = Number(document.getElementById('crossover-points-slider').value);

  params.mutationType = document.getElementById('mutation-type-select').value;
  params.mutationRate = Number(document.getElementById('mutation-rate-slider').value);
  params.mutationJumpRadius = Number(document.getElementById('mutation-jump-radius-slider').value);

  params.eliteCount = Number(document.getElementById('elite-count-slider').value);

  params.replacementMode = document.getElementById('replacement-mode-select').value;
  params.replacementPercent = Number(document.getElementById('replacement-percent-slider').value);

  params.foodDepletes = document.getElementById('food-depletes-checkbox').checked;
  params.foodReplenishes = document.getElementById('food-replenishes-checkbox').checked;
  params.foodMode = foodMode;
  params.foodCapacity = currentFoodCapacity();

  return params;
}

// --- Velikost canvasu: co největší čtverec z dostupného místa (spec 14.2) -
//
// CELL_PIXEL_SIZE (js/render.js) není pevná konstanta — dopočítá se z
// aktuální šířky I výšky #canvas-area, ať plocha nikdy nepřeteče a mřížka
// zabírá dostupné místo rozumně bez ohledu na velikost okna nebo počet
// buněk. Volá se při resetu (mění se gridConfig) i při resize okna/přepnutí
// fullscreenu (mění se dostupné místo, gridConfig zůstává).
//
// Od 14.2 je #canvas-area jen samotná plocha (žádné ovládání, žádný graf
// uvnitř, viz index.html/style.css) — dostupné místo je tedy prostě celý
// obsah #canvas-area, nic se z něj neodečítá kromě malé okrajové rezervy.
// Díky tomu, že CELL_PIXEL_SIZE vychází z min(šířka, výška), je výsledný
// canvas vždycky čtverec (gridConfig má stejný počet buněk na obou osách),
// a to největší možný, který se do #canvas-area vejde — přesně spec 14.2.
var CANVAS_AREA_RESERVE = 8; // malá rezerva na okraj #canvas-container

// isFullscreenActive() je jediné místo, které se ptá na skutečný stav
// Fullscreen API (viz #simulation-wrapper.is-fullscreen, spec 13.6/14.2) —
// zbytek kódu (tahle funkce, CSS ve style.css) se ptá přes ni, ne přímo přes
// document.fullscreenElement, ať jde chování ověřit/vynutit i mimo reálné
// volání requestFullscreen() (to headless prohlížeč bez uživatelského gesta
// obvykle odmítne, viz poznámka u fullscreenchange listeneru níže).
function isFullscreenActive() {
  return document.getElementById('simulation-wrapper').classList.contains('is-fullscreen');
}

function updateCanvasSize() {
  var canvasArea = document.getElementById('canvas-area');
  var availableWidth = canvasArea.clientWidth - CANVAS_AREA_RESERVE;
  var availableHeight = canvasArea.clientHeight - CANVAS_AREA_RESERVE;

  updateCellPixelSize(availableWidth, availableHeight, gridConfig);
  resizeCanvasToGrid(canvas, gridConfig);
  updateFitnessChartCanvasSize();
}

// Graf fitness (spec 8.1/13.6): rozměr canvasu se dopočítává z toho, kolik
// místa mu CSS layout reálně přidělil (#middle-panel, viz style.css), ne z
// pevné konstanty.
function updateFitnessChartCanvasSize() {
  var width = fitnessChartCanvas.clientWidth;
  var height = fitnessChartCanvas.clientHeight;
  if (width > 0) {
    fitnessChartCanvas.width = width;
  }
  if (height > 0) {
    fitnessChartCanvas.height = height;
  }
}

// --- Dynamický strop posuvníku velikosti plochy (spec 14.2) ---------------
//
// Horní mez posuvníku "velikost plochy (buněk na stranu)" už není pevných
// 512 (spec 13.7) — musí se přizpůsobit tomu, kolik místa má #canvas-area
// právě teď k dispozici, ať přenejhorším vyjde přesně MIN_CELL_PIXEL_SIZE
// (1 px, viz render.js) na buňku, ne méně (bakterie by pod tím rozlišením
// prakticky zmizely). Používá stejnou dostupnou plochu jako
// updateCanvasSize() výš, ale počítá naopak: kolik buněk se vejde, ne jak
// velká má být jedna buňka pro pevný počet buněk.
var GRID_SIZE_SLIDER_ABSOLUTE_MIN = 8; // shoduje se s min atributem v HTML

function computeMaxGridSize() {
  var canvasArea = document.getElementById('canvas-area');
  var availableSide = Math.min(
    canvasArea.clientWidth - CANVAS_AREA_RESERVE,
    canvasArea.clientHeight - CANVAS_AREA_RESERVE
  );
  var maxCells = Math.floor(availableSide / MIN_CELL_PIXEL_SIZE);
  if (maxCells < GRID_SIZE_SLIDER_ABSOLUTE_MIN) {
    maxCells = GRID_SIZE_SLIDER_ABSOLUTE_MIN;
  }
  return maxCells;
}

// Přepočítá strop posuvníku podle aktuální velikosti okna a — pokud právě
// zvolená hodnota nový (nižší) strop přesáhne — srovná ji dolů na něj
// (spec 14.2). Volá se při startu (ještě před úplně první resetSimulation(),
// viz "Úvodní inicializace" níže — tam stačí jen srovnat hodnotu slideru,
// samotný reset už provede save-load.js) i při každém resize okna (tam už
// simulace běží, takže srovnání hodnoty musí být doprovázené i skutečným
// restartem, ať gridConfig odpovídá tomu, co slider ukazuje).
function updateGridSizeCap() {
  var slider = document.getElementById('grid-size-slider');
  var maxCells = computeMaxGridSize();
  slider.max = maxCells;
  if (Number(slider.value) > maxCells) {
    slider.value = maxCells;
    document.getElementById('grid-size-value').textContent = String(maxCells);
    if (gridConfig !== undefined) {
      // Velikost plochy mění délku genomu — vyžaduje restart, stejně jako
      // ruční změna posuvníkem (viz 'change' listener u grid-size-slider níže).
      stopRunning();
      resetSimulation();
    }
  }
}

window.addEventListener('resize', function () {
  updateGridSizeCap();
  updateCanvasSize();
  redraw();
});

// --- Reset / inicializace simulace ------------------------------------

// `forceRandomFoodSeed` (nepovinné): i v ručním režimu vytvoří počáteční
// krmení náhodným rozhozením, místo aby začínalo na prázdno — použito jen
// při úplně první inicializaci stránky (spec 13.1: výchozí stav přepínače v
// UI je "ruční kreslení", ale počáteční krmení na ploše je pořád z náhodného
// rozhození "jako dřív"). Běžný reset/reseed tenhle argument nepředává,
// takže se tam ruční režim chová jako obvykle (prázdná plocha k nakreslení).
function resetSimulation(forceRandomFoodSeed) {
  var seedValue = Number(document.getElementById('seed-input').value);
  rng = createRng(seedValue);

  var gridSize = Number(document.getElementById('grid-size-slider').value);
  gridConfig = createGridConfig(gridSize, gridSize);
  updateCanvasSize();

  var populationSize = Number(document.getElementById('population-size-slider').value);
  population = createRandomPopulation(populationSize, gridConfig, rng);

  if (isManualFoodModeActive() && !forceRandomFoodSeed) {
    foodList = []; // ruční režim začíná na prázdno, uživatel si krmení nakreslí sám
  } else {
    var foodCount = Number(document.getElementById('food-count-slider').value);
    foodList = createRandomFood(foodCount, gridConfig, rng, currentFoodCapacity());
  }

  generationCount = 0;
  resetFitnessHistory();
  recordCurrentFitnessStats();
  redraw();
}

// --- Krmení: náhodné rozhození vs. ruční kreslení ------------------------

function isManualFoodModeActive() {
  return foodMode === 'manual';
}

function regenerateRandomFood() {
  var foodCount = Number(document.getElementById('food-count-slider').value);
  foodList = createRandomFood(foodCount, gridConfig, rng, currentFoodCapacity());
  redraw();
}

// Přidá krmení na danou buňku, pokud tam ještě není (ruční kreslení).
function addFoodCellIfMissing(x, y) {
  var alreadyThere = false;
  var i = 0;
  while (i < foodList.length) {
    if (foodList[i].x === x && foodList[i].y === y) {
      alreadyThere = true;
    }
    i = i + 1;
  }
  if (!alreadyThere) {
    foodList.push(createFood(x, y, currentFoodCapacity()));
  }
}

function handlePaintedCell(x, y) {
  addFoodCellIfMissing(x, y);
  redraw();
}

attachManualFoodPainting(
  canvas,
  function () { return gridConfig; }, // živý getter, ať funguje i po resetu s jinou velikostí mřížky
  isManualFoodModeActive,
  handlePaintedCell
);

var foodModeRandomRadio = document.getElementById('food-mode-random');
var foodModeManualRadio = document.getElementById('food-mode-manual');
foodModeRandomRadio.addEventListener('change', function () {
  if (foodModeRandomRadio.checked) {
    foodMode = 'random';
  }
});
foodModeManualRadio.addEventListener('change', function () {
  if (foodModeManualRadio.checked) {
    foodMode = 'manual';
  }
});

document.getElementById('regenerate-food-btn').addEventListener('click', function () {
  if (isManualFoodModeActive()) {
    // Tlačítko je určené pro náhodný režim, ať uživatel v ručním
    // omylem nesmaže vlastní kresbu.
    return;
  }
  regenerateRandomFood();
});

document.getElementById('clear-food-btn').addEventListener('click', function () {
  foodList = [];
  redraw();
});

document.getElementById('food-depletes-checkbox').addEventListener('change', redraw);

// --- Krok evoluce (jedna generace) -----------------------------------

function stepOnce() {
  var params = readParamsFromUI();
  var result = stepGeneration(population, foodList, gridConfig, params, rng);
  population = result.population;
  foodList = result.food;
  generationCount = generationCount + 1;
  recordCurrentFitnessStats();
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

// Text tlačítka start/pauza závisí na stavu (isRunning), ne jen na jazyce —
// proto to není data-i18n atribut v HTML, ale funkce volaná z obou míst,
// která stav mění, a znovu i po přepnutí jazyka (viz onLanguageChanged).
function updateStartPauseButtonText() {
  var button = document.getElementById('start-pause-btn');
  if (isRunning) {
    button.textContent = t('pause_btn');
  } else {
    button.textContent = t('start_btn');
  }
}

function startRunning() {
  if (isRunning) {
    return;
  }

  var speed = Number(document.getElementById('speed-slider').value);
  if (speed === 0) {
    // Rychlost 0 nemá smysluplný interval — "Start" (i mezerník) udělá jen
    // jeden krok, stejně jako tlačítko "Krok po kroku" (spec 10.5).
    stepOnce();
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

// Vrátí true, pokud fokus drží prvek, který mezerník normálně používá sám
// (tlačítko, posuvník/checkbox, výběrové pole, textové pole) — v tom případě
// mezerník necháváme na pokoji, ať nedojde k dvojímu efektu (spec 10.5).
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
  event.preventDefault(); // mezerník by jinak stránku odscrolloval dolů
  if (isRunning) {
    stopRunning();
  } else {
    startRunning();
  }
});

document.getElementById('step-btn').addEventListener('click', function () {
  stopRunning(); // krok po kroku dává smysl hlavně v zastaveném stavu
  stepOnce();
});

// Jediné tlačítko "reset" pokrývá i změnu seedu (spec 13.10) — vždycky
// čte aktuální hodnotu #seed-input, samostatné "nastavit seed" tlačítko by
// dělalo přesně to samé.
document.getElementById('reset-btn').addEventListener('click', function () {
  stopRunning();
  resetSimulation();
});

// --- Pomocná funkce: napojí slider na textový "displej" jeho hodnoty ----
//
// SLIDER_DISPLAY_PAIRS je i seznam, který znovu použije save-load.js
// (spec 12.5, refreshSliderDisplays()) — poté, co načtená data nastaví
// hodnoty sliderů rovnou přes .value (bez uživatelského 'input' eventu),
// je potřeba tenhle displej ručně dorovnat stejnou logikou, ne ji psát
// podruhé na jiném místě.
var SLIDER_DISPLAY_PAIRS = [
  ['speed-slider', 'speed-value'],
  ['population-size-slider', 'population-size-value'],
  ['grid-size-slider', 'grid-size-value'],
  ['food-count-slider', 'food-count-value'],
  ['food-capacity-slider', 'food-capacity-value'],
  ['tournament-size-slider', 'tournament-size-value'],
  ['crossover-rate-slider', 'crossover-rate-value'],
  ['crossover-points-slider', 'crossover-points-value'],
  ['mutation-rate-slider', 'mutation-rate-value'],
  ['mutation-jump-radius-slider', 'mutation-jump-radius-value'],
  ['elite-count-slider', 'elite-count-value'],
  ['replacement-percent-slider', 'replacement-percent-value']
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

// --- Strukturální ovládací prvky: rychlost (za běhu), velikost plochy, ---
// velikost populace, množství krmení ----------------------------------

document.getElementById('speed-slider').addEventListener('input', function () {
  if (!isRunning) {
    return;
  }
  var speed = Number(document.getElementById('speed-slider').value);
  if (speed === 0) {
    // Přetažení na 0 za běhu nemá smysluplný interval — zastavíme (spec 10.5).
    stopRunning();
  } else {
    scheduleNextTick(); // za běhu se rychlost projeví hned, ne až dalším startem
  }
});

document.getElementById('grid-size-slider').addEventListener('change', function () {
  // Velikost plochy mění i délku genomu (počet bitů na osu) — vyžaduje
  // kompletní restart simulace, nejde jen "dopočítat".
  stopRunning();
  resetSimulation();
});

function adjustPopulationSize() {
  var targetSize = Number(document.getElementById('population-size-slider').value);

  if (targetSize > population.length) {
    var toAdd = targetSize - population.length;
    var added = createRandomPopulation(toAdd, gridConfig, rng);
    var i = 0;
    while (i < added.length) {
      population.push(added[i]);
      i = i + 1;
    }
  } else {
    while (population.length > targetSize) {
      population.pop();
    }
  }

  redraw();
}

document.getElementById('population-size-slider').addEventListener('change', adjustPopulationSize);

// --- Populace = 1: deaktivace irelevantních ovládacích prvků (spec 13.4) --
//
// Křížení potřebuje dva různé rodiče a turnajová selekce má "soutěžit" mezi
// víc jedinci — u populace o velikosti 1 obojí ztrácí smysl. Prvky zůstávají
// vidět (jen `disabled`), ať student pořád vidí, že existují — na rozdíl od
// spec 13.8 níže, kde jde o prvky vázané na jinou, zrovna nezvolenou volbu.
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
updatePopulationSizeDependentControls(); // úvodní stav podle výchozí hodnoty slideru

// --- Podmíněné zobrazení parametrů vázaných na konkrétní volbu (spec 13.8) -
//
// Na rozdíl od spec 13.4 výš tady nejde o dočasnou nerelevanci (populace
// zrovna má 1 jedince) — tyhle prvky dávají smysl JEN pro jednu konkrétní
// volbu typu (např. velikost turnaje jen pro turnajovou selekci), pro
// jakoukoliv jinou volbu ne, proto se rovnou skrývají, ne jen deaktivují.
// Značeno atributy data-show-when-select/-value přímo na <label> v HTML —
// obecný mechanismus, ať se pro každou dvojici (select, závislý prvek)
// nepíše samostatná funkce zvlášť.
var CONDITIONAL_CONTROL_LABELS = document.querySelectorAll('[data-show-when-select]');

function updateConditionalControlsVisibility() {
  var i = 0;
  while (i < CONDITIONAL_CONTROL_LABELS.length) {
    var label = CONDITIONAL_CONTROL_LABELS[i];
    var controllingSelect = document.getElementById(label.getAttribute('data-show-when-select'));
    var requiredValue = label.getAttribute('data-show-when-value');
    label.style.display = (controllingSelect.value === requiredValue) ? '' : 'none';
    i = i + 1;
  }
}

var conditionalControlSelectIds = ['selection-method-select', 'crossover-type-select', 'mutation-type-select', 'replacement-mode-select'];
var conditionalSelectIndex = 0;
while (conditionalSelectIndex < conditionalControlSelectIds.length) {
  document.getElementById(conditionalControlSelectIds[conditionalSelectIndex])
    .addEventListener('change', updateConditionalControlsVisibility);
  conditionalSelectIndex = conditionalSelectIndex + 1;
}
updateConditionalControlsVisibility(); // úvodní stav podle výchozích hodnot selectů

document.getElementById('food-count-slider').addEventListener('change', function () {
  if (!isManualFoodModeActive()) {
    regenerateRandomFood();
  }
});

document.getElementById('food-capacity-slider').addEventListener('change', function () {
  // Nová kapacita se projeví na nově vzniklém krmení — v náhodném režimu je
  // to nejjednodušší rozhodit ho znovu, ať se to hned promítne i vizuálně;
  // v ručním režimu zůstává už nakreslené krmení s původní kapacitou (stejné
  // chování jako food-count-slider výše).
  if (!isManualFoodModeActive()) {
    regenerateRandomFood();
  } else {
    redraw(); // aspoň se přepočítá barevná škála podle nové kapacity
  }
});

// --- Zoom ovládání --------------------------------------------------------
//
// Zoom (od 14.2) škáluje jen #canvas-container (samotnou plochu), ne celý
// panel simulace — viz applyZoom v render.js. #canvas-area kolem něj má
// `overflow: auto` (style.css), takže přiblížení nad dostupné místo samo
// vyvolá posuvníky pro výřez (spec 14.2).
var canvasContainerEl = document.getElementById('canvas-container');
var zoomSlider = document.getElementById('zoom-slider');
zoomSlider.addEventListener('input', function () {
  var zoomFactor = Number(zoomSlider.value);
  applyZoom(canvasContainerEl, zoomFactor);
});

// --- Panning: tažení pravým tlačítkem myši posouvá přiblížený výřez -------
//
// Levé tlačítko je už obsazené ručním kreslením krmení (attachManualFoodPainting
// výš) — panning proto poslouchá pravé tlačítko (button === 2) a potlačuje
// kontextové menu prohlížeče na ploše, ať tažení nic nepřeruší (spec 14.2:
// "tažení myší po ploše posouvá zobrazený výřez, ne jen klasický scroll
// kolečkem" — klasické kolečko/posuvníky navíc dál fungují samy od sebe
// díky `overflow: auto` na #canvas-area, tohle je jen alternativa navíc).
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

// --- Fullscreen (spec 10.6, 13.6, přestavěno pro 14.2) ---------------------
//
// Fullscreen API je požádané na #simulation-wrapper (plocha + prostřední
// pruh s ovládáním a grafem, viz index.html) — prohlížeč pak sám zobrazí
// přes celou obrazovku jen tenhle prvek a jeho potomky, #controls jako
// sourozenec zůstane mimo, není potřeba ho schovávat ručně.
//
// Skutečný fullscreen stav (document.fullscreenElement) se navíc zrcadlí do
// třídy .is-fullscreen na #simulation-wrapper (viz isFullscreenActive()
// výš) — CSS i JS v celém souboru se ptají přes ni, ne přímo přes
// Fullscreen API. Důvod je hlavně ověřitelnost: Fullscreen API vyžaduje
// "user activation" (reálný klik), takže ho headless prohlížeč bez skutečné
// interakce nepustí — díky samostatné třídě jde fullscreen layout
// nasimulovat i bez toho (viz PROGRESS.md, sekce Vizuální ověřování).
var fullscreenBtn = document.getElementById('fullscreen-btn');
var simulationWrapperEl = document.getElementById('simulation-wrapper');

function updateFullscreenButtonText() {
  if (isFullscreenActive()) {
    fullscreenBtn.textContent = t('fullscreen_exit_btn');
  } else {
    fullscreenBtn.textContent = t('fullscreen_enter_btn');
  }
}

fullscreenBtn.addEventListener('click', function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    simulationWrapperEl.requestFullscreen();
  }
});

// fullscreenchange se spustí při vstupu i výstupu (i po stisku Esc, kdy
// exitFullscreen() nevoláme sami) — jediné spolehlivé místo pro obojí.
document.addEventListener('fullscreenchange', function () {
  if (document.fullscreenElement !== null) {
    simulationWrapperEl.classList.add('is-fullscreen');
  } else {
    simulationWrapperEl.classList.remove('is-fullscreen');
  }
  updateFullscreenButtonText();
  updateGridSizeCap(); // dostupné místo se vstupem/výstupem z fullscreenu skokově změní
  updateCanvasSize();
  redraw();
});

// --- Sbalitelné sekce nastavení (accordion, spec 10.7) ---------------------
//
// Klik na nadpis (legend) sbalí/rozbalí zbytek fieldsetu (viz .collapsed v
// style.css). Tooltip ikonka je součástí legendy, ale klik na ni sbalení
// spustit nesmí, ať jde na ni nezávisle najet myší/kliknout — proto se
// kliky z .help-icon rovnou přeskočí.
var controlLegends = document.querySelectorAll('#controls legend');
var legendIndex = 0;
while (legendIndex < controlLegends.length) {
  controlLegends[legendIndex].addEventListener('click', function (event) {
    if (event.target.classList.contains('help-icon')) {
      return;
    }
    event.currentTarget.parentElement.classList.toggle('collapsed');
  });
  legendIndex = legendIndex + 1;
}

// --- i18n: obnovení textů generovaných za běhu (mimo data-i18n) ------------
//
// Statické popisky (legendy, labely, texty voleb) mají atribut data-i18n a
// přeloží se samy uvnitř applyTranslations() (viz js/i18n.js). Tahle funkce
// dorovná zbytek — texty, které main.js sám skládá za běhu podle stavu
// simulace, ne jen podle jazyka. Volá ji setLanguage() po každém přepnutí.
function onLanguageChanged() {
  updateStatsLine();
  updateCursorPositionLine();
  updateStartPauseButtonText();
  updateFullscreenButtonText();
  // save-load.js se načítá až po tomhle souboru a má vlastní obdobný
  // stavový řádek (#saveload-status-line) — stejný "volitelný hook" vzor
  // jako setLanguage() používá pro tuhle funkci samotnou (viz i18n.js).
  if (typeof onSaveLoadLanguageChanged === 'function') {
    onSaveLoadLanguageChanged();
  }
}

// --- Úvodní inicializace ------------------------------------------------

updateStartPauseButtonText();
updateFullscreenButtonText();
// Strop posuvníku velikosti plochy potřebuje znát dostupné místo dřív, než
// se poprvé přečte jeho hodnota (spec 14.2) — #canvas-area má ale rozměr
// určený čistě CSS layoutem stránky (grid/flex, viz style.css), ne obsahem
// canvasu, takže tohle jde spočítat i před úplně první resetSimulation().
updateGridSizeCap();
// Skutečná první resetSimulation() proběhne až v js/save-load.js
// (applyInitialSettings(), spec 13.5) — tam se napřed aplikují
// DEFAULT_SETTINGS (jedno místo pravdy pro výchozí hodnoty) a případně
// data z URL, teprve pak dává smysl populaci/krmení vytvořit.
