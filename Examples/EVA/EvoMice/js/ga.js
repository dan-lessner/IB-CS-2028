// EvoMice — evoluční jádro (selekce, křížení, mutace, náhrada generace).
//
// Kódová struktura záměrně odděluje dvě vrstvy (viz spec, sekce 6a):
//   1. ORCHESTRACE — stepGeneration() vidí evoluci jako sled čitelných
//      kroků: spočítej fitness, seřaď, nech přežít elitu, doplň zbytek
//      pomocí select() / crossover() / mutate().
//   2. IMPLEMENTACE — teprve uvnitř select()/crossover()/mutate() se řeší
//      konkrétní "DNA" manipulace: práce s bity genomu, nebo (u nových
//      geometrických variant) přímo se souřadnicemi v prostoru.
// Kdo chce pochopit "co se děje", čte stepGeneration(). Kdo chce vědět
// "jak přesně", zanoří se do konkrétní implementační funkce níže.

// --- Výchozí parametry evoluce -----------------------------------------
//
// Fáze 5 tohle napojí na skutečné UI ovládací prvky. Do té doby slouží
// jako natvrdo nastavené hodnoty pro self-test (a jako dokumentace všech
// parametrů, které simulace zná).
function createDefaultGaParams() {
  return {
    fitnessType: 'binary',        // 'binary' (je/není na krmení) | 'continuous' (klesá se vzdáleností)

    selectionMethod: 'roulette',  // 'roulette' (fitness-proporcionální) | 'tournament'
    tournamentSize: 3,

    crossoverRate: 0.8,           // pravděpodobnost, že potomek vznikne křížením (jinak jen mutovaná kopie 1 rodiče)
    crossoverType: 'xy-split',    // 'xy-split' | 'one-point' | 'multi-point' | 'uniform' | 'line-point' | 'rectangle-point'
    crossoverPoints: 3,           // počet bodů řezu, použito jen pro 'multi-point'

    mutationType: 'bit-flip',     // 'bit-flip' | 'geometric-jump'
    mutationRate: 0.02,           // pravděpodobnost převrácení jednoho bitu (bit-flip)
    mutationJumpRadius: 3,        // max. velikost skoku v buňkách na osu (geometric-jump)

    eliteCount: 2,                // kolik nejlepších jedinců přežije beze změny do další generace

    replacementMode: 'full',      // 'full' (celá generace najednou) | 'partial' (jen nejhorší X %)
    replacementPercent: 50,       // použito jen pro 'partial'

    foodDepletes: false,          // krmení po "snězení" ubývá (nezávislé na foodReplenishes)
    foodReplenishes: false,       // ubylé krmení se doplní na náhodná místa (nezávislé na foodDepletes)
    foodMode: 'random',           // 'random' | 'manual' — jen volí způsob zadání krmení, neovlivňuje doplňování
    foodCapacity: 20              // kolik generací uživí jedno krmítko, než dojde (viz spec 10.3)
  };
}

// --- Hlavní evoluční krok (orchestrace) ---------------------------------

// Provede jednu generaci: ohodnotí populaci, nechá přežít elitu (a případně
// další nejlepší přeživší), zbylá místa doplní novými potomky a nakonec
// vyřeší mizení/obnovu krmení. Vrací { population, food } pro další krok.
function stepGeneration(population, foodList, gridConfig, params, rng) {
  // 1) Ohodnoť aktuální populaci podle přítomnosti/vzdálenosti krmení.
  computeFitness(population, foodList, gridConfig, params.fitnessType);

  // 2) Seřaď od nejlepší po nejhorší — elitismus i "náhrada nejhorších X %"
  //    z tohohle pořadí přímo vychází.
  var sorted = sortPopulationByFitnessDescending(population);

  var eliteCount = Math.min(params.eliteCount, sorted.length);
  var replaceCount = determineReplaceCount(sorted.length, eliteCount, params);
  var survivorsCount = sorted.length - eliteCount - replaceCount;

  var nextGeneration = [];

  // 3) Elita přežívá beze změny.
  var i = 0;
  while (i < eliteCount) {
    nextGeneration.push(sorted[i]);
    i = i + 1;
  }

  // 4) Další nejlepší přeživší — ti, co v tomhle kroku ještě nejsou
  //    nahrazováni (relevantní hlavně pro replacementMode='partial').
  var j = eliteCount;
  while (j < eliteCount + survivorsCount) {
    nextGeneration.push(sorted[j]);
    j = j + 1;
  }

  // 5) Zbylá místa (nejhorší / nenakrmení jedinci) doplní nová generace
  //    potomků: selekce rodičů -> křížení (nebo jen kopie) -> mutace.
  var k = 0;
  while (k < replaceCount) {
    var childCoord;

    if (randomChance(rng, params.crossoverRate)) {
      var parentA = select(sorted, params, rng);
      var parentB = select(sorted, params, rng);
      childCoord = crossover(parentA, parentB, gridConfig, params, rng);
    } else {
      var parent = select(sorted, params, rng);
      childCoord = { x: parent.x, y: parent.y };
    }

    childCoord = mutate(childCoord, gridConfig, params, rng);
    nextGeneration.push(createBacterium(childCoord.x, childCoord.y, gridConfig));

    k = k + 1;
  }

  // 6) Krmení: případné mizení "snězeného" krmení a jeho obnova.
  var nextFood = updateFoodAfterGeneration(nextGeneration, foodList, gridConfig, params, rng);

  return { population: nextGeneration, food: nextFood };
}

// Kolik jedinců (mimo elitu) se má tuhle generaci nahradit novými potomky?
// Tahle jedna funkce pokrývá dvě položky ze zadání zároveň:
//   - "náhrada generace: celá najednou vs. postupná náhrada nejhorších X %"
//   - "nenakrmená bakterie: umírá okamžitě, vs. přežívá dokud ji nenahradí
//     lepší potomek" — protože o tom, kdo se nahradí, rozhoduje pořadí podle
//     fitness (nejhorší/nenakrmení jsou na konci seřazeného pole).
function determineReplaceCount(totalCount, eliteCount, params) {
  var nonEliteCount = totalCount - eliteCount;

  if (params.replacementMode === 'partial') {
    var fraction = params.replacementPercent / 100;
    var count = Math.round(nonEliteCount * fraction);
    if (count < 0) {
      count = 0;
    }
    if (count > nonEliteCount) {
      count = nonEliteCount;
    }
    return count;
  }

  // 'full' (výchozí): nahradíme úplně všechny ne-elitní jedince najednou.
  return nonEliteCount;
}

// Vrátí kopii populace seřazenou od nejvyšší fitness po nejnižší.
// Řazení výběrem (selection sort) — pro velikosti populace v týhle
// simulaci dost rychlé a hlavně snadno čitelné, žádné komparátory.
function sortPopulationByFitnessDescending(population) {
  var sorted = [];
  var i = 0;
  while (i < population.length) {
    sorted.push(population[i]);
    i = i + 1;
  }

  var n = sorted.length;
  var a = 0;
  while (a < n - 1) {
    var bestIndex = a;
    var b = a + 1;
    while (b < n) {
      if (sorted[b].fitness > sorted[bestIndex].fitness) {
        bestIndex = b;
      }
      b = b + 1;
    }
    if (bestIndex !== a) {
      var temp = sorted[a];
      sorted[a] = sorted[bestIndex];
      sorted[bestIndex] = temp;
    }
    a = a + 1;
  }

  return sorted;
}

// --- Fitness --------------------------------------------------------------

// Je bakterie přesně na buňce s krmením? Vyprázdněné krmení (amount 0) se
// počítá, jako by tam nebylo (spec 10.3).
function isBacteriumFed(bacterium, foodList) {
  var i = 0;
  while (i < foodList.length) {
    if (foodList[i].amount > 0 && foodList[i].x === bacterium.x && foodList[i].y === bacterium.y) {
      return true;
    }
    i = i + 1;
  }
  return false;
}

// Euklidovská vzdálenost k nejbližšímu (neprázdnému) krmení (Infinity,
// pokud žádné takové není).
function distanceToNearestFood(x, y, foodList) {
  var nearest = Infinity;
  var i = 0;
  while (i < foodList.length) {
    if (foodList[i].amount > 0) {
      var dx = x - foodList[i].x;
      var dy = y - foodList[i].y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < nearest) {
        nearest = distance;
      }
    }
    i = i + 1;
  }
  return nearest;
}

// Spočítá a uloží fitness každé bakterie v populaci (mutuje bacterium.fitness).
function computeFitness(population, foodList, gridConfig, fitnessType) {
  var i = 0;
  while (i < population.length) {
    var bacterium = population[i];

    if (fitnessType === 'continuous') {
      var distance = distanceToNearestFood(bacterium.x, bacterium.y, foodList);
      bacterium.fitness = 1 / (1 + distance);
    } else {
      // 'binary' (výchozí): 1 pokud bakterie stojí přesně na krmení, jinak 0.
      if (isBacteriumFed(bacterium, foodList)) {
        bacterium.fitness = 1;
      } else {
        bacterium.fitness = 0;
      }
    }

    i = i + 1;
  }
}

// --- Selekce rodiče ------------------------------------------------------
//
// Pravděpodobnost stát se rodičem roste s fitness (spec, bod 3).

function select(population, params, rng) {
  if (params.selectionMethod === 'tournament') {
    return selectByTournament(population, params.tournamentSize, rng);
  }
  // výchozí varianta ('roulette'): fitness-proporcionální výběr
  return selectByRoulette(population, rng);
}

// Turnajová selekce: vyber `tournamentSize` náhodných jedinců a nech
// vyhrát toho s nejvyšší fitness. Vyšší tournamentSize = vyšší tlak
// selekce (rychlejší konvergence, ale menší diverzita).
function selectByTournament(population, tournamentSize, rng) {
  var bestSoFar = population[randomInt(rng, population.length)];
  var i = 1;
  while (i < tournamentSize) {
    var challenger = population[randomInt(rng, population.length)];
    if (challenger.fitness > bestSoFar.fitness) {
      bestSoFar = challenger;
    }
    i = i + 1;
  }
  return bestSoFar;
}

// Ruletová (fitness-proporcionální) selekce: šance na výběr je úměrná
// podílu fitness jedince na celkové fitness populace.
function selectByRoulette(population, rng) {
  var totalFitness = 0;
  var i = 0;
  while (i < population.length) {
    totalFitness = totalFitness + population[i].fitness;
    i = i + 1;
  }

  if (totalFitness <= 0) {
    // Nikdo nemá žádnou fitness (typicky binární fitness a nikdo netrefil
    // krmení) — vážení nedává smysl, vybereme rovnoměrně náhodně. Žádné
    // "náhradní řešení" navíc, viz spec bod 6.3.
    return population[randomInt(rng, population.length)];
  }

  var threshold = rng() * totalFitness;
  var cumulative = 0;
  var j = 0;
  while (j < population.length) {
    cumulative = cumulative + population[j].fitness;
    if (cumulative >= threshold) {
      return population[j];
    }
    j = j + 1;
  }

  // Sem se dostaneme jen kvůli zaokrouhlovacím chybám na floatech.
  return population[population.length - 1];
}

// --- Křížení ---------------------------------------------------------------
//
// 4 bitové varianty (spec 6.1) + 2 geometrické varianty pracující přímo
// se souřadnicemi (spec 6a). Volba je na uživateli v UI (fáze 5).

function crossover(parentA, parentB, gridConfig, params, rng) {
  if (params.crossoverType === 'one-point') {
    var childBits1 = crossoverOnePointBits(parentA.genome, parentB.genome, rng);
    return decodeGenome(childBits1, gridConfig);
  }
  if (params.crossoverType === 'multi-point') {
    var childBits2 = crossoverMultiPointBits(parentA.genome, parentB.genome, params.crossoverPoints, rng);
    return decodeGenome(childBits2, gridConfig);
  }
  if (params.crossoverType === 'uniform') {
    var childBits3 = crossoverUniformBits(parentA.genome, parentB.genome, rng);
    return decodeGenome(childBits3, gridConfig);
  }
  if (params.crossoverType === 'line-point') {
    return crossoverLinePoint(parentA, parentB, gridConfig, rng);
  }
  if (params.crossoverType === 'rectangle-point') {
    return crossoverRectanglePoint(parentA, parentB, gridConfig, rng);
  }
  // výchozí varianta ('xy-split'): celé x od jednoho rodiče, celé y od druhého
  return crossoverXYSplit(parentA, parentB, rng);
}

// Bitová varianta: celý x-genom od jednoho rodiče, celý y-genom od druhého
// (náhodně, který rodič dá x a který y).
function crossoverXYSplit(parentA, parentB, rng) {
  if (randomChance(rng, 0.5)) {
    return { x: parentA.x, y: parentB.y };
  }
  return { x: parentB.x, y: parentA.y };
}

// Klasický jednobodový crossover přes celý binární řetězec (x-bity i
// y-bity dohromady, řez může padnout kamkoliv).
function crossoverOnePointBits(genomeA, genomeB, rng) {
  var length = genomeA.length;
  var cutPoint = 1 + randomInt(rng, length - 1); // aspoň 1 bit od každého rodiče
  var childBits = new Array(length);
  var i = 0;
  while (i < length) {
    if (i < cutPoint) {
      childBits[i] = genomeA[i];
    } else {
      childBits[i] = genomeB[i];
    }
    i = i + 1;
  }
  return childBits;
}

// Vícebodový crossover: víc bodů řezu, rodiče se u každého bodu střídají.
function crossoverMultiPointBits(genomeA, genomeB, numberOfPoints, rng) {
  var length = genomeA.length;
  var cutPoints = chooseDistinctCutPoints(numberOfPoints, length, rng);

  var childBits = new Array(length);
  var currentParentIsA = true;
  var nextCutIndex = 0;
  var i = 0;
  while (i < length) {
    while (nextCutIndex < cutPoints.length && i === cutPoints[nextCutIndex]) {
      currentParentIsA = !currentParentIsA;
      nextCutIndex = nextCutIndex + 1;
    }
    if (currentParentIsA) {
      childBits[i] = genomeA[i];
    } else {
      childBits[i] = genomeB[i];
    }
    i = i + 1;
  }
  return childBits;
}

// Vybere `count` různých bodů řezu z rozsahu [1, length-1], vzestupně seřazené.
function chooseDistinctCutPoints(count, length, rng) {
  var maxPossible = length - 1;
  if (count > maxPossible) {
    count = maxPossible;
  }

  var points = [];
  while (points.length < count) {
    var candidate = 1 + randomInt(rng, maxPossible);
    if (!arrayContainsValue(points, candidate)) {
      points.push(candidate);
    }
  }

  // Vzestupné seřazení výběrem — pole je malé (řádově jednotky bodů).
  var n = points.length;
  var a = 0;
  while (a < n - 1) {
    var minIndex = a;
    var b = a + 1;
    while (b < n) {
      if (points[b] < points[minIndex]) {
        minIndex = b;
      }
      b = b + 1;
    }
    if (minIndex !== a) {
      var temp = points[a];
      points[a] = points[minIndex];
      points[minIndex] = temp;
    }
    a = a + 1;
  }

  return points;
}

function arrayContainsValue(array, value) {
  var i = 0;
  while (i < array.length) {
    if (array[i] === value) {
      return true;
    }
    i = i + 1;
  }
  return false;
}

// Uniformní (per-bit) crossover: každý bit nezávisle padne na 50:50
// od jednoho nebo druhého rodiče.
function crossoverUniformBits(genomeA, genomeB, rng) {
  var length = genomeA.length;
  var childBits = new Array(length);
  var i = 0;
  while (i < length) {
    if (randomChance(rng, 0.5)) {
      childBits[i] = genomeA[i];
    } else {
      childBits[i] = genomeB[i];
    }
    i = i + 1;
  }
  return childBits;
}

// Geometrická varianta: potomek je náhodný bod na úsečce mezi rodiči
// (lineární interpolace s parametrem t ∈ [0,1] — spec, bod 6a).
function crossoverLinePoint(parentA, parentB, gridConfig, rng) {
  var t = rng();
  var childX = Math.round(parentA.x + t * (parentB.x - parentA.x));
  var childY = Math.round(parentA.y + t * (parentB.y - parentA.y));
  return clampCoordToGrid(childX, childY, gridConfig);
}

// Geometrická varianta: souřadnice rodičů tvoří protilehlé rohy obdélníku,
// potomek je náhodný bod uvnitř něj (x a y nezávisle — spec, bod 6a).
function crossoverRectanglePoint(parentA, parentB, gridConfig, rng) {
  var minX = Math.min(parentA.x, parentB.x);
  var maxX = Math.max(parentA.x, parentB.x);
  var minY = Math.min(parentA.y, parentB.y);
  var maxY = Math.max(parentA.y, parentB.y);

  var childX = minX + randomInt(rng, maxX - minX + 1);
  var childY = minY + randomInt(rng, maxY - minY + 1);
  return { x: childX, y: childY };
}

// --- Mutace ----------------------------------------------------------------
//
// Bitová varianta (spec 3) + geometrická varianta "skok do okolí" (spec 6a).

function mutate(coord, gridConfig, params, rng) {
  if (params.mutationType === 'geometric-jump') {
    return mutateGeometricJump(coord, gridConfig, params.mutationJumpRadius, rng);
  }
  // výchozí varianta ('bit-flip'): každý bit genomu se s pravděpodobností p převrátí
  return mutateBitFlip(coord, gridConfig, params.mutationRate, rng);
}

function mutateBitFlip(coord, gridConfig, mutationRate, rng) {
  var genome = encodeGenome(coord.x, coord.y, gridConfig);
  var i = 0;
  while (i < genome.length) {
    if (randomChance(rng, mutationRate)) {
      if (genome[i] === 0) {
        genome[i] = 1;
      } else {
        genome[i] = 0;
      }
    }
    i = i + 1;
  }
  return decodeGenome(genome, gridConfig);
}

// Bakterie se posune o malý náhodný vektor (v rozsahu ±jumpRadius na obou
// osách) místo náhodného převrácení bitů genomu.
function mutateGeometricJump(coord, gridConfig, jumpRadius, rng) {
  var dx = Math.round((rng() * 2 - 1) * jumpRadius);
  var dy = Math.round((rng() * 2 - 1) * jumpRadius);
  return clampCoordToGrid(coord.x + dx, coord.y + dy, gridConfig);
}

// --- Obecné pomocné funkce -------------------------------------------------

function clampInt(value, minValue, maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

function clampCoordToGrid(x, y, gridConfig) {
  return {
    x: clampInt(x, 0, gridConfig.cellsX - 1),
    y: clampInt(y, 0, gridConfig.cellsY - 1)
  };
}

// --- Krmení: mizení po "snězení" a obnova ----------------------------------

// Dvě nezávislé volby (spec 10.2, libovolná kombinace):
//   - foodDepletes:    krmení ubyde o tolik jednotek, kolik bakterií na
//                       buňce stojí — jedna bakterie sní jednu jednotku za
//                       generaci (spec 12.4; ne pevně 1 bez ohledu na počet
//                       bakterií, jak to dřív omylem počítalo
//                       isFoodEatenByAnyMouse) — a když tím množství klesne
//                       na 0, buňka se z výčtu úplně odstraní
//   - foodReplenishes: co takhle "došlo" se doplní na nová náhodná místa,
//                       vždy zase na plnou kapacitu
// Pokud foodDepletes není zapnuté, nic neubývá, takže foodReplenishes samo
// o sobě nemá co doplňovat — kombinace je platná, jen bez pozorovatelného
// efektu (žádné speciální ošetření navíc, viz spec bod 6.3).
function updateFoodAfterGeneration(population, foodList, gridConfig, params, rng) {
  var remainingFood = foodList;

  if (params.foodDepletes) {
    remainingFood = [];
    var i = 0;
    while (i < foodList.length) {
      var food = foodList[i];
      var bacteriaOnCell = countBacteriaOnCell(food.x, food.y, population);
      food.amount = food.amount - bacteriaOnCell;
      if (food.amount < 0) {
        food.amount = 0; // víc bakterií, než kolik krmení zbývalo — nejde jít do záporu
      }
      if (food.amount > 0) {
        remainingFood.push(food);
      }
      i = i + 1;
    }
  }

  if (params.foodReplenishes) {
    // Doplníme zpátky na původní počet, na nová náhodná místa, opět na
    // plnou kapacitu — nezávisle na foodMode, aby to platilo stejně pro
    // náhodné i ručně nakreslené krmení.
    var missing = foodList.length - remainingFood.length;
    var placed = 0;
    while (placed < missing) {
      var fx = randomInt(rng, gridConfig.cellsX);
      var fy = randomInt(rng, gridConfig.cellsY);
      remainingFood.push(createFood(fx, fy, params.foodCapacity));
      placed = placed + 1;
    }
  }

  return remainingFood;
}

// --- Inicializace populace ---------------------------------------------

function createRandomPopulation(size, gridConfig, rng) {
  var population = [];
  var i = 0;
  while (i < size) {
    var x = randomInt(rng, gridConfig.cellsX);
    var y = randomInt(rng, gridConfig.cellsY);
    population.push(createBacterium(x, y, gridConfig));
    i = i + 1;
  }
  return population;
}

// Rozhodí `count` kusů krmení (na plnou kapacitu) na náhodná místa mřížky
// (režim "náhodné rozhození").
function createRandomFood(count, gridConfig, rng, capacity) {
  var foodList = [];
  var i = 0;
  while (i < count) {
    var x = randomInt(rng, gridConfig.cellsX);
    var y = randomInt(rng, gridConfig.cellsY);
    foodList.push(createFood(x, y, capacity));
    i = i + 1;
  }
  return foodList;
}

// Kolik krmení zbývá na buňce (x, y). 0, pokud tam žádné (neprázdné) krmení
// není — používá se pro řádek se souřadnicemi kurzoru (spec 10.4).
function foodAmountOnCell(x, y, foodList) {
  var i = 0;
  while (i < foodList.length) {
    if (foodList[i].x === x && foodList[i].y === y) {
      return foodList[i].amount;
    }
    i = i + 1;
  }
  return 0;
}

// --- Hustota bakterií na buňce (pro vykreslení, spec 10.3) ----------------

// Kolik bakterií z populace celkem stojí na buňce (x, y). Prostý lineární
// průchod (i pro krmení v updateFoodAfterGeneration výše) — pro velikosti
// populace v EvoMice je to dost rychlé a nevyžaduje to žádnou pomocnou mapu.
function countBacteriaOnCell(x, y, population) {
  var count = 0;
  var i = 0;
  while (i < population.length) {
    if (population[i].x === x && population[i].y === y) {
      count = count + 1;
    }
    i = i + 1;
  }
  return count;
}

// Nejvyšší hustota (počet bakterií na jedné buňce) v celé aktuální populaci —
// slouží jako "100 %" pro barevnou škálu hustoty při vykreslení.
function computeMaxBacteriaDensity(population) {
  var maxDensity = 0;
  var i = 0;
  while (i < population.length) {
    var density = countBacteriaOnCell(population[i].x, population[i].y, population);
    if (density > maxDensity) {
      maxDensity = density;
    }
    i = i + 1;
  }
  return maxDensity;
}

// --- Self-testy --------------------------------------------------------
//
// Žádné UI zatím (to přijde ve fázi 5) — evoluční jádro ověřujeme přes
// konzoli, na natvrdo nastavených hodnotách, stejným stylem jako genome.js.

function runGaSelfTests() {
  var testsRun = 0;
  var rng = createRng(1234);
  var gridConfig = createGridConfig(20, 20);
  var testFoodCapacity = 20; // libovolná kladná hodnota, testy kapacitu samu neřeší

  // --- Fitness ------------------------------------------------------
  var foodHere = [createFood(5, 5, testFoodCapacity)];
  var bacteriumOnFood = createBacterium(5, 5, gridConfig);
  var bacteriumAway = createBacterium(0, 0, gridConfig);

  computeFitness([bacteriumOnFood, bacteriumAway], foodHere, gridConfig, 'binary');
  console.assert(bacteriumOnFood.fitness === 1, 'binární fitness: bakterie na krmení má mít fitness 1');
  console.assert(bacteriumAway.fitness === 0, 'binární fitness: bakterie mimo krmení má mít fitness 0');
  testsRun = testsRun + 2;

  computeFitness([bacteriumOnFood, bacteriumAway], foodHere, gridConfig, 'continuous');
  console.assert(bacteriumOnFood.fitness === 1, 'spojitá fitness: bakterie přesně na krmení má mít fitness 1');
  console.assert(
    bacteriumAway.fitness > 0 && bacteriumAway.fitness < 1,
    'spojitá fitness: vzdálená bakterie má mít fitness mezi 0 a 1'
  );
  testsRun = testsRun + 2;

  // --- Křížení: všech 6 variant musí vrátit souřadnici uvnitř mřížky ---
  var parentA = createBacterium(2, 2, gridConfig);
  var parentB = createBacterium(17, 15, gridConfig);
  var crossoverTypes = ['xy-split', 'one-point', 'multi-point', 'uniform', 'line-point', 'rectangle-point'];
  var typeIndex = 0;
  while (typeIndex < crossoverTypes.length) {
    var crossParams = createDefaultGaParams();
    crossParams.crossoverType = crossoverTypes[typeIndex];
    var trial = 0;
    while (trial < 20) {
      var child = crossover(parentA, parentB, gridConfig, crossParams, rng);
      console.assert(
        child.x >= 0 && child.x < gridConfig.cellsX && child.y >= 0 && child.y < gridConfig.cellsY,
        'crossover (' + crossParams.crossoverType + '): souřadnice mimo mřížku'
      );
      testsRun = testsRun + 1;
      trial = trial + 1;
    }
    typeIndex = typeIndex + 1;
  }

  // --- Mutace: obě varianty musí vrátit souřadnici uvnitř mřížky -------
  var mutationTypes = ['bit-flip', 'geometric-jump'];
  var mutIndex = 0;
  while (mutIndex < mutationTypes.length) {
    var mutParams = createDefaultGaParams();
    mutParams.mutationType = mutationTypes[mutIndex];
    mutParams.mutationRate = 0.5; // vyšší šance na projevení mutace v testu
    var mtrial = 0;
    while (mtrial < 20) {
      var mutated = mutate({ x: 10, y: 10 }, gridConfig, mutParams, rng);
      console.assert(
        mutated.x >= 0 && mutated.x < gridConfig.cellsX && mutated.y >= 0 && mutated.y < gridConfig.cellsY,
        'mutate (' + mutParams.mutationType + '): souřadnice mimo mřížku'
      );
      testsRun = testsRun + 1;
      mtrial = mtrial + 1;
    }
    mutIndex = mutIndex + 1;
  }

  // --- Selekce: obě metody vrací jedince z populace ----------------------
  var population = createRandomPopulation(30, gridConfig, rng);
  computeFitness(population, foodHere, gridConfig, 'binary');

  var selParams1 = createDefaultGaParams();
  selParams1.selectionMethod = 'roulette';
  var picked1 = select(population, selParams1, rng);
  console.assert(population.indexOf(picked1) !== -1, 'select (roulette): vybraný jedinec musí být z populace');
  testsRun = testsRun + 1;

  var selParams2 = createDefaultGaParams();
  selParams2.selectionMethod = 'tournament';
  selParams2.tournamentSize = 4;
  var picked2 = select(population, selParams2, rng);
  console.assert(population.indexOf(picked2) !== -1, 'select (tournament): vybraný jedinec musí být z populace');
  testsRun = testsRun + 1;

  // --- stepGeneration: velikost populace se nesmí měnit, ať jsou -------
  // parametry jakékoliv (celá i postupná náhrada, krmení ubývá/doplňuje
  // se v libovolné nezávislé kombinaci, viz spec 10.2) -------------------
  var replacementModes = ['full', 'partial'];
  var foodDepletesOptions = [false, true];
  var foodReplenishesOptions = [false, true];
  var rmIndex = 0;
  while (rmIndex < replacementModes.length) {
    var fdIndex = 0;
    while (fdIndex < foodDepletesOptions.length) {
      var frIndex = 0;
      while (frIndex < foodReplenishesOptions.length) {
        var stepParams = createDefaultGaParams();
        stepParams.replacementMode = replacementModes[rmIndex];
        stepParams.replacementPercent = 30;
        stepParams.foodDepletes = foodDepletesOptions[fdIndex];
        stepParams.foodReplenishes = foodReplenishesOptions[frIndex];

        var testPopulation = createRandomPopulation(25, gridConfig, rng);
        var testFood = [
          createFood(3, 3, testFoodCapacity),
          createFood(15, 16, testFoodCapacity),
          createFood(9, 1, testFoodCapacity)
        ];

        var gen = 0;
        while (gen < 5) {
          var result = stepGeneration(testPopulation, testFood, gridConfig, stepParams, rng);
          console.assert(
            result.population.length === 25,
            'stepGeneration: velikost populace se nesmí měnit (replacementMode=' + stepParams.replacementMode + ')'
          );
          testPopulation = result.population;
          testFood = result.food;
          gen = gen + 1;
        }
        testsRun = testsRun + 5;

        frIndex = frIndex + 1;
      }
      fdIndex = fdIndex + 1;
    }
    rmIndex = rmIndex + 1;
  }

  // --- foodReplenishes: bez depletes nemá co doplňovat, počet krmení ---
  // se nesmí měnit; s depletes drží počet krmení konstantní -------------
  var replenishOnlyParams = createDefaultGaParams();
  replenishOnlyParams.foodDepletes = false;
  replenishOnlyParams.foodReplenishes = true;
  var replenishOnlyPopulation = [createBacterium(3, 3, gridConfig)];
  var replenishOnlyFood = [createFood(3, 3, testFoodCapacity), createFood(4, 4, testFoodCapacity)];
  var replenishOnlyResult = stepGeneration(replenishOnlyPopulation, replenishOnlyFood, gridConfig, replenishOnlyParams, rng);
  console.assert(
    replenishOnlyResult.food.length === 2,
    'foodReplenishes bez foodDepletes nesmí měnit počet krmení'
  );
  testsRun = testsRun + 1;

  var replenishWithDepletesParams = createDefaultGaParams();
  replenishWithDepletesParams.foodDepletes = true;
  replenishWithDepletesParams.foodReplenishes = true;
  replenishWithDepletesParams.foodCapacity = 1; // kapacita 1 -> hned po snězení klesne na 0 a zmizí
  var replenishWithDepletesPopulation = [createBacterium(3, 3, gridConfig)];
  var replenishWithDepletesFood = [createFood(3, 3, 1), createFood(4, 4, 1)];
  var replenishWithDepletesResult = stepGeneration(
    replenishWithDepletesPopulation, replenishWithDepletesFood, gridConfig, replenishWithDepletesParams, rng
  );
  console.assert(
    replenishWithDepletesResult.food.length === 2,
    'foodDepletes + foodReplenishes dohromady musí držet počet krmení konstantní'
  );
  testsRun = testsRun + 1;

  // --- foodDepletes: kapacita > 1 ubývá postupně, ne naráz -----------------
  var graduallyDepletesParams = createDefaultGaParams();
  graduallyDepletesParams.foodDepletes = true;
  graduallyDepletesParams.foodReplenishes = false;
  graduallyDepletesParams.foodCapacity = 3;
  var graduallyDepletesPopulation = [createBacterium(3, 3, gridConfig)];
  var graduallyDepletesFood = [createFood(3, 3, 3)];
  var stepResult1 = stepGeneration(graduallyDepletesPopulation, graduallyDepletesFood, gridConfig, graduallyDepletesParams, rng);
  console.assert(
    stepResult1.food.length === 1 && stepResult1.food[0].amount === 2,
    'foodDepletes: po první "snězené" generaci má krmení s kapacitou 3 zbýt amount 2'
  );
  var stepResult2 = stepGeneration(stepResult1.population, stepResult1.food, gridConfig, graduallyDepletesParams, rng);
  console.assert(
    stepResult2.food.length === 1 && stepResult2.food[0].amount === 1,
    'foodDepletes: po druhé "snězené" generaci má krmení s kapacitou 3 zbýt amount 1'
  );
  var stepResult3 = stepGeneration(stepResult2.population, stepResult2.food, gridConfig, graduallyDepletesParams, rng);
  console.assert(
    stepResult3.food.length === 0,
    'foodDepletes: po třetí "snězené" generaci má krmení s kapacitou 3 úplně zmizet'
  );
  testsRun = testsRun + 3;

  // --- foodDepletes: N bakterií na buňce sní N jednotek za generaci (spec 12.4) -
  // eliteCount vyšší než velikost populace zaručí, že celá populace přežije
  // beze změny (stejné pozice) — potřebné, aby test spolehlivě věděl, kolik
  // bakterií na krmné buňce po kroku zůstane, bez ohledu na selekci/křížení/mutaci.
  var multiBacteriaParams = createDefaultGaParams();
  multiBacteriaParams.foodDepletes = true;
  multiBacteriaParams.foodReplenishes = false;
  multiBacteriaParams.eliteCount = 10;
  var multiBacteriaPopulation = [
    createBacterium(6, 6, gridConfig),
    createBacterium(6, 6, gridConfig),
    createBacterium(6, 6, gridConfig),
    createBacterium(6, 6, gridConfig)
  ];
  var multiBacteriaFood = [createFood(6, 6, 10)];
  var multiBacteriaResult = stepGeneration(multiBacteriaPopulation, multiBacteriaFood, gridConfig, multiBacteriaParams, rng);
  console.assert(
    multiBacteriaResult.food.length === 1 && multiBacteriaResult.food[0].amount === 6,
    'foodDepletes: 4 bakterie na buňce mají za jednu generaci sníst 4 jednotky (10 - 4 = 6), ne jen 1'
  );
  testsRun = testsRun + 1;

  // Víc bakterií, než kolik krmení zbývá, nesmí spotřebu poslat do záporu —
  // buňka se prostě úplně vyprázdní a zmizí.
  var overeatingParams = createDefaultGaParams();
  overeatingParams.foodDepletes = true;
  overeatingParams.foodReplenishes = false;
  overeatingParams.eliteCount = 10;
  var overeatingPopulation = [
    createBacterium(6, 6, gridConfig),
    createBacterium(6, 6, gridConfig),
    createBacterium(6, 6, gridConfig),
    createBacterium(6, 6, gridConfig)
  ];
  var overeatingFood = [createFood(6, 6, 2)];
  var overeatingResult = stepGeneration(overeatingPopulation, overeatingFood, gridConfig, overeatingParams, rng);
  console.assert(
    overeatingResult.food.length === 0,
    'foodDepletes: víc bakterií než zbývajícího krmení má buňku úplně vyprázdnit, ne jít do záporu'
  );
  testsRun = testsRun + 1;

  // --- isBacteriumFed / distanceToNearestFood ignorují vyprázdněné krmení -----
  var emptyFood = [{ x: 5, y: 5, amount: 0 }];
  var bacteriumOnEmptyFood = createBacterium(5, 5, gridConfig);
  console.assert(
    isBacteriumFed(bacteriumOnEmptyFood, emptyFood) === false,
    'isBacteriumFed: krmení s amount 0 se nepočítá, jako by tam nebylo'
  );
  console.assert(
    distanceToNearestFood(0, 0, emptyFood) === Infinity,
    'distanceToNearestFood: vyprázdněné krmení se do vzdálenosti nepočítá'
  );
  testsRun = testsRun + 2;

  // --- Hustota bakterií na buňce ------------------------------------------
  var densityPopulation = [
    createBacterium(2, 2, gridConfig),
    createBacterium(2, 2, gridConfig),
    createBacterium(2, 2, gridConfig),
    createBacterium(7, 7, gridConfig)
  ];
  console.assert(
    countBacteriaOnCell(2, 2, densityPopulation) === 3,
    'countBacteriaOnCell: na buňce (2,2) mají stát 3 bakterie'
  );
  console.assert(
    countBacteriaOnCell(7, 7, densityPopulation) === 1,
    'countBacteriaOnCell: na buňce (7,7) má stát 1 bakterie'
  );
  console.assert(
    countBacteriaOnCell(0, 0, densityPopulation) === 0,
    'countBacteriaOnCell: na prázdné buňce má být 0 bakterií'
  );
  console.assert(
    computeMaxBacteriaDensity(densityPopulation) === 3,
    'computeMaxBacteriaDensity: nejvyšší hustota v populaci má být 3'
  );
  testsRun = testsRun + 4;

  // --- foodAmountOnCell (pro řádek se souřadnicemi kurzoru, spec 10.4) ----
  var cursorFood = [createFood(8, 8, 12)];
  console.assert(
    foodAmountOnCell(8, 8, cursorFood) === 12,
    'foodAmountOnCell: na obsazené buňce má vrátit aktuální množství'
  );
  console.assert(
    foodAmountOnCell(0, 0, cursorFood) === 0,
    'foodAmountOnCell: na buňce bez krmení má vrátit 0'
  );
  testsRun = testsRun + 2;

  // --- Random seed: stejný seed musí dát stejný výsledek ------------------
  var seedA = createRng(777);
  var seedB = createRng(777);
  var popA = createRandomPopulation(10, gridConfig, seedA);
  var popB = createRandomPopulation(10, gridConfig, seedB);
  var same = true;
  var si = 0;
  while (si < popA.length) {
    if (popA[si].x !== popB[si].x || popA[si].y !== popB[si].y) {
      same = false;
    }
    si = si + 1;
  }
  console.assert(same, 'random seed: stejný seed musí dát stejnou náhodnou populaci');
  testsRun = testsRun + 1;

  console.log('EvoMice: GA self-test hotov (' + testsRun + ' dílčích ověření). ' +
    'Pokud výše nejsou žádné "Assertion failed" zprávy, vše je v pořádku.');
}

runGaSelfTests();
