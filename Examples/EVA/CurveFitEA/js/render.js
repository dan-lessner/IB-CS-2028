// CurveFitEA — vykreslování na canvas (osy, populace křivek, body, zvýrazněná
// křivka se čtverci odchylek) a zoom.
//
// Vykreslování je čistě "hloupé": dostane aktuální stav (doména, body,
// populace, případně index zvýrazněné křivky) a překreslí canvas. Nerozhoduje
// o ničem evolučním ani o vstupu — jen si při každém volání drawScene()
// zapamatuje pixelové vzorky každé křivky (viz getLastCurveSamples), které
// js/input.js použije pro hit-testing (najetí myší/klik na křivku).

// Velikost plochy (čtverec, spec 14.2 — co největší čtverec z dostupného
// místa) v pixelech. Není to pevná konstanta — dopočítává se z rozměru
// #canvas-area, viz updateCanvasPixelSize() níže.
var CANVAS_PIXEL_SIZE = 480;

var COLOR_BACKGROUND = '#101014';
var COLOR_AXIS = '#3a3a44';
var COLOR_POINT_FILL = '#e8e8ec';
var COLOR_POINT_BORDER = '#101014';
var COLOR_CURVE_BASE = '#5aa6ff';       // barva "obyčejné" (nezvýrazněné) křivky
var COLOR_CURVE_HIGHLIGHT = '#ffb14c';  // zvýrazněná (hover/pin) křivka
var COLOR_DEVIATION_SQUARE = 'rgba(255, 111, 97, 0.35)';
var COLOR_DEVIATION_SQUARE_BORDER = '#ff6f61';

var POINT_RADIUS_PX = 5;
var CURVE_SAMPLE_COUNT = 100; // kolik úseček tvoří vykreslenou/hit-testovanou křivku

// --- Mapování doména <-> pixel ---------------------------------------------

function worldToPixelX(x) {
  return ((x - WORLD_X_MIN) / (WORLD_X_MAX - WORLD_X_MIN)) * CANVAS_PIXEL_SIZE;
}

function worldToPixelY(y, worldConfig) {
  var ratio = (y - worldConfig.yMin) / (worldConfig.yMax - worldConfig.yMin);
  return CANVAS_PIXEL_SIZE - ratio * CANVAS_PIXEL_SIZE; // y roste nahoru, pixely dolů
}

function pixelToWorldX(px) {
  return WORLD_X_MIN + (px / CANVAS_PIXEL_SIZE) * (WORLD_X_MAX - WORLD_X_MIN);
}

function pixelToWorldY(py, worldConfig) {
  var ratio = (CANVAS_PIXEL_SIZE - py) / CANVAS_PIXEL_SIZE;
  return worldConfig.yMin + ratio * (worldConfig.yMax - worldConfig.yMin);
}

// Přepočítá CANVAS_PIXEL_SIZE na co největší čtverec, který se vejde do
// dostupného místa (spec 14.2), a nastaví podle něj skutečný rozměr canvasu.
function updateCanvasPixelSize(canvas, availableWidth, availableHeight) {
  var side = Math.floor(Math.min(availableWidth, availableHeight));
  if (side < 50) {
    side = 50; // rozumné dno, ať plocha nikdy nezmizí úplně
  }
  CANVAS_PIXEL_SIZE = side;
  canvas.width = side;
  canvas.height = side;
}

// --- Vykreslení jednotlivých vrstev -----------------------------------------

function drawBackground(ctx) {
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_PIXEL_SIZE, CANVAS_PIXEL_SIZE);
}

// Osy x=0 a y=0, jen pokud padnou do viditelné oblasti — čistě orientační,
// žádné popisky/měřítko (drženo minimalistické, spec to nevyžaduje).
function drawAxes(ctx, worldConfig) {
  ctx.strokeStyle = COLOR_AXIS;
  ctx.lineWidth = 1;

  if (WORLD_X_MIN <= 0 && 0 <= WORLD_X_MAX) {
    var xPixel = Math.round(worldToPixelX(0)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(xPixel, 0);
    ctx.lineTo(xPixel, CANVAS_PIXEL_SIZE);
    ctx.stroke();
  }

  if (worldConfig.yMin <= 0 && 0 <= worldConfig.yMax) {
    var yPixel = Math.round(worldToPixelY(0, worldConfig)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yPixel);
    ctx.lineTo(CANVAS_PIXEL_SIZE, yPixel);
    ctx.stroke();
  }
}

// Spočítá pixelové vzorky (polyline) jedné křivky přes celou doménu x.
function computeCurvePixelSamples(coeffs, worldConfig) {
  var samples = [];
  var i = 0;
  while (i <= CURVE_SAMPLE_COUNT) {
    var x = WORLD_X_MIN + (i / CURVE_SAMPLE_COUNT) * (WORLD_X_MAX - WORLD_X_MIN);
    var y = evaluatePolynomial(coeffs, x);
    samples.push({ px: worldToPixelX(x), py: worldToPixelY(y, worldConfig) });
    i = i + 1;
  }
  return samples;
}

// Vykreslí celou populaci křivek (spec bod 3: sytost barvy podle fitness —
// čím lepší fitness, tím sytější/neprůhlednější). Vrací pole pixelových
// vzorků každé křivky (stejné pořadí jako population) — js/input.js si ho
// nechá vracet přes getLastCurveSamples() pro hit-testing.
var MIN_CURVE_ALPHA = 0.06;
var MAX_CURVE_ALPHA = 0.9;

function drawPopulationCurves(ctx, population, worldConfig, highlightedIndex) {
  var samplesByIndividual = [];

  var minFitness = Infinity;
  var maxFitness = -Infinity;
  var i = 0;
  while (i < population.length) {
    if (population[i].fitness < minFitness) {
      minFitness = population[i].fitness;
    }
    if (population[i].fitness > maxFitness) {
      maxFitness = population[i].fitness;
    }
    i = i + 1;
  }

  // Nezvýrazněné křivky nejdřív, zvýrazněná (pokud nějaká) navrch, ať není
  // překreslená ostatními.
  var j = 0;
  while (j < population.length) {
    var samples = computeCurvePixelSamples(population[j].coeffs, worldConfig);
    samplesByIndividual.push(samples);
    if (j !== highlightedIndex) {
      var alphaRatio = 0;
      if (maxFitness > minFitness) {
        alphaRatio = (population[j].fitness - minFitness) / (maxFitness - minFitness);
      }
      var alpha = MIN_CURVE_ALPHA + alphaRatio * (MAX_CURVE_ALPHA - MIN_CURVE_ALPHA);
      drawCurvePolyline(ctx, samples, colorWithAlpha(COLOR_CURVE_BASE, alpha), 1.5);
    }
    j = j + 1;
  }

  if (highlightedIndex !== null && highlightedIndex >= 0 && highlightedIndex < population.length) {
    drawCurvePolyline(ctx, samplesByIndividual[highlightedIndex], COLOR_CURVE_HIGHLIGHT, 2.5);
  }

  return samplesByIndividual;
}

function drawCurvePolyline(ctx, samples, strokeStyle, lineWidth) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  var i = 0;
  while (i < samples.length) {
    if (i === 0) {
      ctx.moveTo(samples[i].px, samples[i].py);
    } else {
      ctx.lineTo(samples[i].px, samples[i].py);
    }
    i = i + 1;
  }
  ctx.stroke();
}

function colorWithAlpha(hexColor, alpha) {
  var r = parseInt(hexColor.substr(1, 2), 16);
  var g = parseInt(hexColor.substr(3, 2), 16);
  var b = parseInt(hexColor.substr(5, 2), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// Body (spec bod 2: "body jsou VŽDY v popředí, překreslují se přes křivky,
// ne naopak") — kreslí se proto vždy jako poslední vrstva, viz drawScene().
function drawPoints(ctx, points, worldConfig) {
  ctx.lineWidth = 1.5;
  var i = 0;
  while (i < points.length) {
    var px = worldToPixelX(points[i].x);
    var py = worldToPixelY(points[i].y, worldConfig);
    ctx.fillStyle = COLOR_POINT_FILL;
    ctx.strokeStyle = COLOR_POINT_BORDER;
    ctx.beginPath();
    ctx.arc(px, py, POINT_RADIUS_PX, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    i = i + 1;
  }
}

// Čtverce odchylek (spec bod 2): pro zvýrazněnou křivku nakreslí u každého
// bodu čtverec, jehož strana = velikost svislé odchylky bod<->křivka
// (klasická geometrická vizualizace metody nejmenších čtverců), plus tenkou
// spojnici bod-křivka. Vrací součet čtverců (SSE) pro zobrazení vedle plochy.
function drawDeviationSquares(ctx, individual, points, worldConfig) {
  var sumOfSquares = 0;
  var i = 0;
  while (i < points.length) {
    var point = points[i];
    var curveY = evaluatePolynomial(individual.coeffs, point.x);
    var deviation = point.y - curveY;
    sumOfSquares = sumOfSquares + deviation * deviation;

    var pointPx = worldToPixelX(point.x);
    var pointPy = worldToPixelY(point.y, worldConfig);
    var curvePy = worldToPixelY(curveY, worldConfig);
    var sidePx = Math.abs(pointPy - curvePy);

    if (sidePx > 0.5) {
      var squareTop = Math.min(pointPy, curvePy);
      ctx.fillStyle = COLOR_DEVIATION_SQUARE;
      ctx.strokeStyle = COLOR_DEVIATION_SQUARE_BORDER;
      ctx.lineWidth = 1;
      ctx.fillRect(pointPx, squareTop, sidePx, sidePx);
      ctx.strokeRect(pointPx, squareTop, sidePx, sidePx);
    }

    ctx.strokeStyle = COLOR_DEVIATION_SQUARE_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pointPx, pointPy);
    ctx.lineTo(pointPx, curvePy);
    ctx.stroke();

    i = i + 1;
  }
  return sumOfSquares;
}

// --- Historie nejlepších jedinců (spec bod 3) -------------------------------
//
// Stopa nejlepšího jedince z každé předchozí generace, jinou barvou než
// aktuální populace a s postupným blednutím směrem do minulosti (nejnovější
// nejsytější, nejstarší skoro průhledná) — cíl je vidět, jak se řešení v
// čase vyvíjelo, ne jen aktuální stav. Kreslí se PŘED populací (spec bod 2:
// tahle stopa je jen kontext, aktuální populace a body musí zůstat čitelné
// navrch).
var COLOR_HISTORY = '#c77dff';
var MIN_HISTORY_ALPHA = 0.03;
var MAX_HISTORY_ALPHA = 0.55;

function drawHistoryTrail(ctx, historyCoeffsList, worldConfig) {
  var count = historyCoeffsList.length;
  var i = 0;
  while (i < count) {
    // i=0 je nejstarší záznam (viz main.js, historie se plní na konec pole)
    // -> ratio roste směrem k nejnovějšímu, takže ten je nejsytější.
    var ratio = count === 1 ? 1 : i / (count - 1);
    var alpha = MIN_HISTORY_ALPHA + ratio * (MAX_HISTORY_ALPHA - MIN_HISTORY_ALPHA);
    var samples = computeCurvePixelSamples(historyCoeffsList[i], worldConfig);
    drawCurvePolyline(ctx, samples, colorWithAlpha(COLOR_HISTORY, alpha), 1.5);
    i = i + 1;
  }
}

// --- Hlavní vykreslovací krok ------------------------------------------------
//
// Pořadí vrstev: pozadí, osy, historie nejlepších (volitelná, spec bod 3),
// populace křivek (nezvýrazněné, pak zvýrazněná navrch), čtverce odchylek
// zvýrazněné křivky, body úplně navrch (spec bod 2). Vrací pixelové vzorky
// každé křivky (pro hit-testing v js/input.js) a — je-li nějaká křivka
// zvýrazněná — součet čtverců jejích odchylek (jinak null).
function drawScene(ctx, population, points, worldConfig, highlightedIndex, historyCoeffsList) {
  drawBackground(ctx);
  drawAxes(ctx, worldConfig);

  if (historyCoeffsList !== undefined && historyCoeffsList.length > 0) {
    drawHistoryTrail(ctx, historyCoeffsList, worldConfig);
  }

  var samplesByIndividual = drawPopulationCurves(ctx, population, worldConfig, highlightedIndex);

  var highlightedSumOfSquares = null;
  if (highlightedIndex !== null && highlightedIndex >= 0 && highlightedIndex < population.length) {
    highlightedSumOfSquares = drawDeviationSquares(ctx, population[highlightedIndex], points, worldConfig);
  }

  drawPoints(ctx, points, worldConfig);

  return { curveSamples: samplesByIndividual, highlightedSumOfSquares: highlightedSumOfSquares };
}

// --- Zoom ---------------------------------------------------------------
//
// Stejný princip jako EvoMice (spec 14.2): CSS `zoom` na obalový
// #canvas-container (ne `transform`, ať zvětšení skutečně zvětší i místo,
// které prvek v layoutu zabírá) — #canvas-area kolem něj má `overflow: auto`
// (viz style.css), takže přiblížení nad dostupné místo samo vyvolá
// posuvníky pro výřez; tažení pravým tlačítkem myši (viz main.js) ten výřez
// navíc posouvá (panning).
function applyZoom(canvasContainerElement, zoomFactor) {
  canvasContainerElement.style.zoom = zoomFactor;
}
