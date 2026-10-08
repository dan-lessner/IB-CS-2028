// EvoMice — sledování a vykreslení fitness populace v čase.
//
// Stejné dělení jako jinde v projektu: tenhle modul jen počítá statistiky a
// kreslí graf, nerozhoduje o tom, kdy se má co spočítat — to řídí main.js
// (viz recordCurrentFitnessStats() a volání v resetSimulation()/stepOnce()).

var fitnessHistory = []; // pole { gen, min, avg, max }, jedna položka na generaci

// Vynuluje historii — volá se při každém restartu simulace (nová náhodná
// populace, změna velikosti plochy, reseed), ať graf ukazuje jen "od
// posledního restartu" (spec 8.1).
function resetFitnessHistory() {
  fitnessHistory = [];
}

// Spočítá min/průměr/max fitness aktuální populace a přidá je do historie.
// Očekává, že population[i].fitness už je spočítané — viz computeFitness()
// v ga.js, volané z main.js těsně před tímhle.
function recordFitnessSnapshot(gen, population) {
  if (population.length === 0) {
    return;
  }

  var minFitness = population[0].fitness;
  var maxFitness = population[0].fitness;
  var sumFitness = 0;

  var i = 0;
  while (i < population.length) {
    var fitness = population[i].fitness;
    if (fitness < minFitness) {
      minFitness = fitness;
    }
    if (fitness > maxFitness) {
      maxFitness = fitness;
    }
    sumFitness = sumFitness + fitness;
    i = i + 1;
  }

  fitnessHistory.push({
    gen: gen,
    min: minFitness,
    max: maxFitness,
    avg: sumFitness / population.length
  });
}

// --- Vykreslení -------------------------------------------------------------
//
// Fitness je vždy v rozsahu [0, 1] (binární i spojitá varianta, viz
// computeFitness v ga.js) — osa y je proto pevně 0 až 1, žádné dopočítávání
// měřítka podle aktuálních dat.

var FITNESS_CHART_COLOR_BACKGROUND = '#101014';
var FITNESS_CHART_COLOR_AXIS = '#3a3a44';
var FITNESS_CHART_COLOR_MIN = '#5a8bd6';
var FITNESS_CHART_COLOR_AVG = '#c77dff';
var FITNESS_CHART_COLOR_MAX = '#ff6f61';

function drawFitnessChart(ctx, canvas) {
  ctx.fillStyle = FITNESS_CHART_COLOR_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = FITNESS_CHART_COLOR_AXIS;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

  if (fitnessHistory.length < 2) {
    return; // jeden bod nejde spojit čárou
  }

  drawFitnessLine(ctx, canvas, 'min', FITNESS_CHART_COLOR_MIN);
  drawFitnessLine(ctx, canvas, 'avg', FITNESS_CHART_COLOR_AVG);
  drawFitnessLine(ctx, canvas, 'max', FITNESS_CHART_COLOR_MAX);
}

// Vykreslí jednu ze tří křivek (min/avg/max) přes celou historii.
// `fieldName` je 'min' | 'avg' | 'max' — jméno položky v záznamech historie.
function drawFitnessLine(ctx, canvas, fieldName, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  var i = 0;
  while (i < fitnessHistory.length) {
    var pointX = (i / (fitnessHistory.length - 1)) * canvas.width;
    var value = fitnessHistory[i][fieldName];
    var pointY = canvas.height - value * canvas.height; // fitness 1 nahoře, 0 dole

    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
    i = i + 1;
  }

  ctx.stroke();
}
