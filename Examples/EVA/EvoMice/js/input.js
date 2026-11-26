// EvoMice — ruční kreslení krmení myší (kurzorem) po canvasu.
//
// Tenhle modul jen převádí polohu kurzoru na souřadnici buňky mřížky
// a hlásí "sem klikni/táhni" ven přes callback — nerozhoduje, co se
// s tím má stát (to řeší kód, který si tuhle funkci zavolá).

// Přepočítá pozici myši (klientské souřadnice z eventu) na souřadnici
// buňky mřížky. Vrací null, pokud je kurzor mimo canvas/mřížku.
function canvasPositionToCell(canvas, gridConfig, clientX, clientY) {
  var rect = canvas.getBoundingClientRect();

  // rect už zohledňuje případný CSS zoom (viz applyZoom v render.js), takže
  // poměr canvas.width / rect.width nám dá zpět "zoom faktor", i když se
  // zoom aplikuje na obalový #canvas-container, ne přímo na canvas.
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;

  var canvasPixelX = (clientX - rect.left) * scaleX;
  var canvasPixelY = (clientY - rect.top) * scaleY;

  var cellX = Math.floor(canvasPixelX / CELL_PIXEL_SIZE);
  var cellY = Math.floor(canvasPixelY / CELL_PIXEL_SIZE);

  if (cellX < 0 || cellX >= gridConfig.cellsX || cellY < 0 || cellY >= gridConfig.cellsY) {
    return null;
  }

  return { x: cellX, y: cellY };
}

// Napojí posluchače myši na canvas pro ruční kreslení krmení.
//
// - getGridConfigFn(): funkce bez parametrů, vrací aktuální konfiguraci
//   mřížky. Je to funkce (ne přímo objekt), protože velikost plochy jde
//   v UI za běhu měnit (reset) — kdybychom si mřížku "zapamatovali" jen
//   jednou při napojení posluchačů, po resetu by ruční kreslení počítalo
//   se starou (už neplatnou) velikostí plochy.
// - isActiveFn(): funkce bez parametrů, vrací true, pokud je právě
//   zapnutý režim "ruční kreslení" (jinak se klikání/tažení ignoruje)
// - onPaintCell(x, y): callback zavolaný pro každou buňku, na kterou
//   uživatel klikl nebo přes kterou přetáhl kurzor se stisknutým tlačítkem
function attachManualFoodPainting(canvas, getGridConfigFn, isActiveFn, onPaintCell) {
  var isPainting = false;

  function paintAtEvent(event) {
    var cell = canvasPositionToCell(canvas, getGridConfigFn(), event.clientX, event.clientY);
    if (cell !== null) {
      onPaintCell(cell.x, cell.y);
    }
  }

  canvas.addEventListener('mousedown', function (event) {
    // Pravé tlačítko je vyhrazené pro panning výřezu při zoomu (spec 14.2,
    // viz posluchače na #canvas-area v main.js) — kreslení krmení reaguje
    // jen na levé tlačítko, ať se ty dvě interakce navzájem neruší.
    if (!isActiveFn() || event.button !== 0) {
      return;
    }
    isPainting = true;
    paintAtEvent(event);
  });

  canvas.addEventListener('mousemove', function (event) {
    if (!isPainting || !isActiveFn()) {
      return;
    }
    paintAtEvent(event);
  });

  // mouseup posloucháme na celém okně, ne jen na canvasu — uživatel může
  // pustit tlačítko myši i mimo canvas (typické chování při tažení).
  window.addEventListener('mouseup', function () {
    isPainting = false;
  });
}
