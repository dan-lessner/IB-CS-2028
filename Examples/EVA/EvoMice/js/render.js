// EvoMice — vykreslování na canvas (mřížka, bakterie, krmení) a zoom.
//
// Vykreslování je čistě "hloupé": dostane aktuální stav (mřížka, populace,
// krmení) a překreslí canvas. Nerozhoduje o ničem evolučním ani o vstupu.

// Kolik pixelů canvasu odpovídá jedné buňce mřížky (před zoomem). Není to
// pevná konstanta (spec 10.6) — dopočítává se z dostupné šířky plochy a
// počtu buněk mřížky, viz updateCellPixelSize() níže. Počáteční hodnota tu
// zůstává jen jako rozumný výchozí stav, než proběhne první přepočet.
var CELL_PIXEL_SIZE = 6;

// 1 px je skutečné dno (spec 14.2: bakterie nesmí "zmizet" pod rozlišení) —
// posuvník velikosti plochy má dynamický strop přesně tak, aby na tohle
// dno nikdy nesáhl (viz computeMaxGridSize() v main.js), takže se sem
// prakticky nikdy nedorazí, je to jen poslední pojistka.
var MIN_CELL_PIXEL_SIZE = 1;
var MAX_CELL_PIXEL_SIZE = 20; // nad tímhle by malá mřížka zbytečně zabírala celou obrazovku

var COLOR_BACKGROUND = '#101014';
var COLOR_GRID_LINE = '#1c1c22';

// Krmení (spec 10.3): barva buňky vyjadřuje zbývající množství jako poměr
// amount / kapacita — černá (prázdno/žádné krmení) až po sytě zelenou (plná
// kapacita).
var COLOR_FOOD_EMPTY = '#101014'; // stejná jako pozadí — vyprázdněné krmení splyne s plochou
var COLOR_FOOD_FULL = '#4caf50';

// Hustota bakterií (spec 10.3): vnitřní čtverec bakterie je barvený podle
// toho, kolik dalších bakterií stojí na stejné buňce vůči nejvyšší hustotě v aktuálním
// snímku — žlutá (nízká hustota) až po červenou (nejvyšší hustota).
var COLOR_DENSITY_LOW = '#ffeb3b';
var COLOR_DENSITY_HIGH = '#e53935';

// Nastaví rozměr canvasu (v pixelech) podle velikosti mřížky.
function resizeCanvasToGrid(canvas, gridConfig) {
  canvas.width = gridConfig.cellsX * CELL_PIXEL_SIZE;
  canvas.height = gridConfig.cellsY * CELL_PIXEL_SIZE;
}

// Přepočítá CELL_PIXEL_SIZE tak, aby se mřížka o rozměru gridConfig.cellsX ×
// gridConfig.cellsY buněk vešla do dostupného místa (v pixelech) — spec 10.6
// a 12.1 ("plocha nesmí přetékat, zmenší se velikost buněk"). Bere v potaz
// šířku i výšku zvlášť a použije tu přísnější (menší) z obou, ať mřížka
// nepřeteče ani na jednu stranu.
function updateCellPixelSize(availableWidth, availableHeight, gridConfig) {
  var rawSizeByWidth = Math.floor(availableWidth / gridConfig.cellsX);
  var rawSizeByHeight = Math.floor(availableHeight / gridConfig.cellsY);
  var rawSize = Math.min(rawSizeByWidth, rawSizeByHeight);

  if (rawSize < MIN_CELL_PIXEL_SIZE) {
    rawSize = MIN_CELL_PIXEL_SIZE;
  }
  if (rawSize > MAX_CELL_PIXEL_SIZE) {
    rawSize = MAX_CELL_PIXEL_SIZE;
  }

  CELL_PIXEL_SIZE = rawSize;
}

// Vykreslí jednobarevné pozadí přes celý canvas.
function drawBackground(ctx, canvas) {
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Vykreslí tenké čáry mřížky. Při malých buňkách (velká mřížka) mřížku
// raději nekreslíme, aby canvas nezčernal samými čarami.
function drawGridLines(ctx, gridConfig) {
  if (CELL_PIXEL_SIZE < 4) {
    return;
  }
  ctx.strokeStyle = COLOR_GRID_LINE;
  ctx.lineWidth = 1;

  var col = 0;
  while (col <= gridConfig.cellsX) {
    var xPixel = col * CELL_PIXEL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(xPixel, 0);
    ctx.lineTo(xPixel, gridConfig.cellsY * CELL_PIXEL_SIZE);
    ctx.stroke();
    col = col + 1;
  }

  var row = 0;
  while (row <= gridConfig.cellsY) {
    var yPixel = row * CELL_PIXEL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, yPixel);
    ctx.lineTo(gridConfig.cellsX * CELL_PIXEL_SIZE, yPixel);
    ctx.stroke();
    row = row + 1;
  }
}

// Vykreslí jednu buňku jako vyplněný čtverec — volitelně menší a odsazenou
// od okraje (inset), aby zbytek buňky pod ní zůstal vidět (spec 10.3, hustota
// bakterií přes krmení).
function drawCell(ctx, x, y, color, inset) {
  var size = CELL_PIXEL_SIZE - inset * 2;
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL_PIXEL_SIZE + inset, y * CELL_PIXEL_SIZE + inset, size, size);
}

// Lineární interpolace mezi dvěma barvami ve formátu '#rrggbb' podle poměru
// 0 (colorFrom) až 1 (colorTo). Hodnoty mimo rozsah se oříznou.
function interpolateColor(colorFrom, colorTo, ratio) {
  var clampedRatio = ratio;
  if (clampedRatio < 0) {
    clampedRatio = 0;
  }
  if (clampedRatio > 1) {
    clampedRatio = 1;
  }

  var fromR = parseInt(colorFrom.substr(1, 2), 16);
  var fromG = parseInt(colorFrom.substr(3, 2), 16);
  var fromB = parseInt(colorFrom.substr(5, 2), 16);
  var toR = parseInt(colorTo.substr(1, 2), 16);
  var toG = parseInt(colorTo.substr(3, 2), 16);
  var toB = parseInt(colorTo.substr(5, 2), 16);

  var r = Math.round(fromR + (toR - fromR) * clampedRatio);
  var g = Math.round(fromG + (toG - fromG) * clampedRatio);
  var b = Math.round(fromB + (toB - fromB) * clampedRatio);

  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// Barva buňky krmení podle zbývajícího množství vůči kapacitě.
function foodAmountColor(food, foodCapacity) {
  var ratio = food.amount / foodCapacity;
  return interpolateColor(COLOR_FOOD_EMPTY, COLOR_FOOD_FULL, ratio);
}

function drawFood(ctx, foodList, foodCapacity) {
  var i = 0;
  while (i < foodList.length) {
    drawCell(ctx, foodList[i].x, foodList[i].y, foodAmountColor(foodList[i], foodCapacity), 0);
    i = i + 1;
  }
}

// Bakterie se kreslí jako menší čtverec odsazený od okraje buňky (spec
// 10.3) — zbytek buňky (okraj) tak zůstává vidět v barvě krmení pod ní.
// Barva vnitřního čtverce vyjadřuje lokální hustotu bakterií na téhle buňce
// vůči nejvyšší hustotě v aktuálním snímku.
var BACTERIUM_INSET = 1; // px odsazení od okraje buňky

function drawBacteria(ctx, population) {
  var maxDensity = computeMaxBacteriaDensity(population);
  var i = 0;
  while (i < population.length) {
    var bacterium = population[i];
    var density = countBacteriaOnCell(bacterium.x, bacterium.y, population);
    var densityRatio = 0;
    if (maxDensity > 0) {
      densityRatio = density / maxDensity;
    }
    var color = interpolateColor(COLOR_DENSITY_LOW, COLOR_DENSITY_HIGH, densityRatio);
    drawCell(ctx, bacterium.x, bacterium.y, color, BACTERIUM_INSET);
    i = i + 1;
  }
}

// Hlavní vykreslovací krok: překreslí celou scénu od začátku.
// Pořadí je důležité — krmení se kreslí pod bakterie, aby bakterie stojící
// na krmení byla vidět (její vnitřní čtverec "vyhraje" uprostřed buňky).
function drawScene(ctx, canvas, gridConfig, population, foodList, foodCapacity) {
  drawBackground(ctx, canvas);
  drawGridLines(ctx, gridConfig);
  drawFood(ctx, foodList, foodCapacity);
  drawBacteria(ctx, population);
}

// --- Zoom ---------------------------------------------------------------
//
// Zoom je čistě vizuální: škáluje jen #canvas-container (canvas samotný),
// neovlivňuje rozlišení mřížky ani souřadnice (spec 6.4). Od 14.2 se
// aplikuje jen na samotnou plochu, ne na celý panel simulace — #canvas-area
// kolem něj má `overflow: auto` (viz style.css), takže jakmile je
// #canvas-container přiblížením větší než dostupné místo, prohlížeč sám
// nabídne posuvníky pro výřez (spec 14.2); tažení pravým tlačítkem myši po
// ploše ten výřez navíc posouvá (panning, viz attachCanvasPanning() v
// main.js).
//
// Použitá je CSS vlastnost `zoom`, ne `transform: scale`. Rozdíl je v tom,
// že `zoom` mění i to, kolik místa prvek v layoutu zabírá (transform ne) —
// díky tomu právě vzniká reálný přetékající obsah, na který #canvas-area
// zareaguje posuvníky, místo aby zůstal jen vizuálně zvětšený na místě.
function applyZoom(canvasContainerElement, zoomFactor) {
  canvasContainerElement.style.zoom = zoomFactor;
}
