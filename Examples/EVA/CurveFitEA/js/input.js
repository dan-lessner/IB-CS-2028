// CurveFitEA — ruční úprava bodů myší a rozpoznání "najetí/kliknutí na
// křivku" (spec bod 2).
//
// Tenhle modul jen převádí polohu kurzoru na pixelové/doménové souřadnice a
// hledá nejbližší bod/křivku — nerozhoduje, co se s tím má stát (add/delete/
// drag/pin), to řeší stavový automat v main.js, který si tenhle modul volá.

var POINT_HIT_RADIUS_PX = 10;      // tolerance pro "trefil jsem se do bodu"
var CURVE_HIT_TOLERANCE_PX = 6;    // tolerance pro "trefil jsem se do křivky"
var DRAG_MOVE_THRESHOLD_PX = 4;    // od kolika pixelů pohybu už jde o tažení, ne klik

// Přepočítá pozici myši (klientské souřadnice z eventu) na pixelovou pozici
// v souřadnicích canvasu (zohledňuje CSS zoom stejně jako EvoMice
// canvasPositionToCell — rect už zoom zahrnuje, poměr canvas.width/rect.width
// dá zpátky zoom faktor).
function clientToCanvasPixel(canvas, clientX, clientY) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;
  var scaleY = canvas.height / rect.height;
  return {
    px: (clientX - rect.left) * scaleX,
    py: (clientY - rect.top) * scaleY
  };
}

function canvasPixelToWorld(pixel, worldConfig) {
  return {
    x: pixelToWorldX(pixel.px),
    y: pixelToWorldY(pixel.py, worldConfig)
  };
}

// Najde index bodu nejblíž zadané pixelové pozici, pokud je do
// POINT_HIT_RADIUS_PX (jinak null).
function hitTestPoint(points, pixel, worldConfig) {
  var bestIndex = null;
  var bestDistance = POINT_HIT_RADIUS_PX;
  var i = 0;
  while (i < points.length) {
    var px = worldToPixelX(points[i].x);
    var py = worldToPixelY(points[i].y, worldConfig);
    var dx = px - pixel.px;
    var dy = py - pixel.py;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
    i = i + 1;
  }
  return bestIndex;
}

// Vzdálenost bodu od úsečky (pro hit-test křivky, ta je reprezentovaná jako
// polyline vzorků — viz computeCurvePixelSamples v render.js).
function distancePointToSegment(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    var directDx = px - x1;
    var directDy = py - y1;
    return Math.sqrt(directDx * directDx + directDy * directDy);
  }
  var t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  if (t < 0) {
    t = 0;
  }
  if (t > 1) {
    t = 1;
  }
  var closestX = x1 + t * dx;
  var closestY = y1 + t * dy;
  var distX = px - closestX;
  var distY = py - closestY;
  return Math.sqrt(distX * distX + distY * distY);
}

// Najde index křivky (z pole pixelových vzorků vrácených drawScene()) nejblíž
// zadané pixelové pozici, pokud je do CURVE_HIT_TOLERANCE_PX (jinak null).
function hitTestCurve(curveSamplesByIndividual, pixel) {
  var bestIndex = null;
  var bestDistance = CURVE_HIT_TOLERANCE_PX;
  var curveIndex = 0;
  while (curveIndex < curveSamplesByIndividual.length) {
    var samples = curveSamplesByIndividual[curveIndex];
    var segmentIndex = 0;
    while (segmentIndex < samples.length - 1) {
      var a = samples[segmentIndex];
      var b = samples[segmentIndex + 1];
      var distance = distancePointToSegment(pixel.px, pixel.py, a.px, a.py, b.px, b.py);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestIndex = curveIndex;
      }
      segmentIndex = segmentIndex + 1;
    }
    curveIndex = curveIndex + 1;
  }
  return bestIndex;
}
