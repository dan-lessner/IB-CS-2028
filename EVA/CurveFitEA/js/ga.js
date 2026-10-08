// CurveFitEA — evoluční jádro (selekce, křížení, mutace, náhrada generace).
//
// Stejné rozdělení vrstev jako EvoMice (spec 6a, viz i tamní js/ga.js):
//   1. ORCHESTRACE — stepGeneration() čte jako sled kroků: spočítej chybu,
//      seřaď, nech přežít elitu, zbytek doplň přes select()/crossover()/mutate().
//   2. IMPLEMENTACE — teprve uvnitř select()/crossover()/mutate() se řeší
//      konkrétní manipulace s "DNA": buď bity zakódovaného genomu (bitová
//      varianta), nebo přímo reálné koeficienty (doménová varianta).
// Kdo chce vědět "co se děje", čte stepGeneration(). Kdo chce vědět "jak
// přesně", zanoří se do konkrétní implementační funkce níže.

// --- Výchozí parametry evoluce ------------------------------------------

function createDefaultGaParams() {
  return {
    degree: 1,                     // stupeň polynomu (spec 1: 1 = přímka, výchozí); s degreeEvolves=true je to STROP (maximální stupeň), ne pevná hodnota (spec 6)
    degreeEvolves: false,          // spec 6: stupeň je součást genomu (mutuje/dědí se), místo pevné hodnoty
    degreeMutationRate: 0.1,       // pravděpodobnost, že se při mutaci stupeň posune o ±1 (použito jen pro degreeEvolves)
    fitnessType: 'sse',            // 'sse' (výchozí) | 'mae' | 'max-error' | 'hit-count'
    fitnessTolerance: 1,           // použito jen pro 'hit-count' (spec 7)

    genomeTransform: 'direct',     // 'direct' (výchozí) | 'normalized' — spec 5.1, jen bitová varianta
    genomeNumeric: 'float',        // 'integer' | 'fixed' | 'float' (výchozí) — spec 5.2, jen bitová varianta
    genomeFixedBits: 8,            // použito jen pro genomeNumeric === 'fixed'

    selectionMethod: 'roulette',   // 'roulette' (fitness-proporcionální) | 'tournament'
    tournamentSize: 3,

    crossoverRate: 0.8,            // pravděpodobnost, že potomek vznikne křížením (jinak jen mutovaná kopie 1 rodiče)
    crossoverType: 'one-point',    // 'one-point' | 'multi-point' | 'uniform' (bitové) | 'param-alternate' | 'line-point' (doménové)
    crossoverPoints: 3,            // počet bodů řezu, použito jen pro 'multi-point'

    mutationType: 'bit-flip',      // 'bit-flip' (bitové) | 'gaussian-jump' (doménové)
    mutationRate: 0.02,            // pravděpodobnost převrácení jednoho bitu (bit-flip)
    mutationSigma: 0.3,            // směrodatná odchylka náhodného posunu koeficientu (gaussian-jump)

    eliteCount: 0,                 // kolik nejlepších jedinců přežije beze změny do další generace

    replacementMode: 'full',       // 'full' (celá generace najednou) | 'partial' (jen nejhorší X %)
    replacementPercent: 50         // použito jen pro 'partial'
  };
}

// --- Hlavní evoluční krok (orchestrace) ---------------------------------

// Provede jednu generaci: ohodnotí populaci podle chyby vůči bodům, nechá
// přežít elitu (a případně další nejlepší přeživší), zbylá místa doplní
// novými potomky. Vrací novou populaci (stejné velikosti jako vstupní).
function stepGeneration(population, points, params, rng) {
  // 1) Ohodnoť aktuální populaci — nižší chyba (SSE/MAE) = vyšší fitness.
  var coeffRange = computeCoeffRange(points);
  computeFitness(population, points, params.fitnessType, params.fitnessTolerance);

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

  // 4) Další nejlepší přeživší — relevantní hlavně pro replacementMode='partial'.
  var j = eliteCount;
  while (j < eliteCount + survivorsCount) {
    nextGeneration.push(sorted[j]);
    j = j + 1;
  }

  // 5) Zbylá místa doplní nová generace potomků: selekce rodičů -> křížení
  //    (nebo jen kopie jednoho rodiče) -> mutace.
  var k = 0;
  while (k < replaceCount) {
    var childCoeffs;

    if (randomChance(rng, params.crossoverRate)) {
      var parentA = select(sorted, params, rng);
      var parentB = select(sorted, params, rng);
      childCoeffs = crossover(parentA, parentB, params, coeffRange, rng);
    } else {
      var parent = select(sorted, params, rng);
      childCoeffs = parent.coeffs.slice();
    }

    childCoeffs = mutate(childCoeffs, params, coeffRange, rng);
    nextGeneration.push(createIndividual(childCoeffs));

    k = k + 1;
  }

  return nextGeneration;
}

// Kolik jedinců (mimo elitu) se má tuhle generaci nahradit novými potomky?
// (spec, sdílená konvence EvoMice 13.9: náhrada generace nad elitismem, jsou
// to dvě nezávislé osy — viz PROGRESS.md/i18n tooltip pro vysvětlení rozdílu.)
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

// Vrátí kopii populace seřazenou od nejvyšší fitness po nejnižší (selection
// sort — pro velikosti populace v týhle simulaci dost rychlé a hlavně
// snadno čitelné, žádné komparátory, stejně jako EvoMice).
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

// --- Fitness ----------------------------------------------------------------
//
// Chyba (SSE/MAE, viz model.js computeError) je "čím míň, tím líp" — pro
// selekci/řazení potřebujeme opak ("čím víc, tím líp"), proto fitness =
// 1 / (1 + chyba). Nikdy nedělí nulou (chyba >= 0), 0 chyby -> fitness 1.
function computeFitness(population, points, fitnessType, fitnessTolerance) {
  var i = 0;
  while (i < population.length) {
    var individual = population[i];
    individual.error = computeError(individual.coeffs, points, fitnessType, fitnessTolerance);
    individual.fitness = 1 / (1 + individual.error);
    i = i + 1;
  }
}

// --- Selekce rodiče ------------------------------------------------------
//
// Pravděpodobnost stát se rodičem roste s fitness (tj. klesá s chybou).

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
    // Fitness je vždy > 0 (viz computeFitness), ale kdyby přece jen celková
    // suma vyšla 0/záporně (obranná pojistka), vybereme rovnoměrně náhodně.
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
// Bitové varianty (spec 4.1, jednobodové/vícebodové/uniformní — stejný kód
// jako EvoMice, jen genom místo x/y souřadnic) + doménové varianty (spec
// 4.2 — střídavé přebírání celých koeficientů, bod mezi rodiči).

// Konfigurace reprezentace genomu (spec 5) vytažená z GA parametrů — jedno
// místo, odkud ji čtou všechny bitové operátory níže (encodeGenome/
// decodeGenome v model.js), ať se nikde neopakuje `{transform: params...}`.
function genomeConfigFromParams(params) {
  return { transform: params.genomeTransform, numeric: params.genomeNumeric, fixedBits: params.genomeFixedBits };
}

// Doplní vektor koeficientů nulami na požadovaný stupeň (jen prodlužuje,
// nikdy nezkracuje) — potřeba pro křížení dvou rodičů různého stupně, viz
// spec 6 a crossover() níže.
function padCoeffsToDegree(coeffs, degree) {
  var padded = coeffs.slice();
  while (padded.length <= degree) {
    padded.push(0);
  }
  return padded;
}

// Spec 6 (stupeň jako součást genomu): když degreeEvolves není zapnuté, oba
// rodiče mají vždy stejný stupeň (= params.degree) a tahle funkce se chová
// přesně jako dřív. Když JE zapnuté, rodiče mohou mít různý stupeň — potomek
// zdědí stupeň od jednoho z nich (spec 6: "křížení stupně = převzetí od
// jednoho z rodičů"), koeficienty se zkříží na doplněných (vyrovnaných na
// stejnou délku) vektorech a pak oříznou na zděděný stupeň.
function crossover(parentA, parentB, params, coeffRange, rng) {
  var genomeConfig = genomeConfigFromParams(params);

  var degreeA = parentA.coeffs.length - 1;
  var degreeB = parentB.coeffs.length - 1;
  var maxParentDegree = Math.max(degreeA, degreeB);
  var childDegree = params.degreeEvolves ? (randomChance(rng, 0.5) ? degreeA : degreeB) : params.degree;

  var coeffsA = padCoeffsToDegree(parentA.coeffs, maxParentDegree);
  var coeffsB = padCoeffsToDegree(parentB.coeffs, maxParentDegree);

  var childCoeffsFull;
  if (params.crossoverType === 'multi-point') {
    var genomeA1 = encodeGenome(coeffsA, coeffRange, genomeConfig);
    var genomeB1 = encodeGenome(coeffsB, coeffRange, genomeConfig);
    var childBits1 = crossoverMultiPointBits(genomeA1, genomeB1, params.crossoverPoints, rng);
    childCoeffsFull = decodeGenome(childBits1, maxParentDegree, coeffRange, genomeConfig);
  } else if (params.crossoverType === 'uniform') {
    var genomeA2 = encodeGenome(coeffsA, coeffRange, genomeConfig);
    var genomeB2 = encodeGenome(coeffsB, coeffRange, genomeConfig);
    var childBits2 = crossoverUniformBits(genomeA2, genomeB2, rng);
    childCoeffsFull = decodeGenome(childBits2, maxParentDegree, coeffRange, genomeConfig);
  } else if (params.crossoverType === 'param-alternate') {
    childCoeffsFull = crossoverParamAlternate({ coeffs: coeffsA }, { coeffs: coeffsB }, rng);
  } else if (params.crossoverType === 'line-point') {
    childCoeffsFull = crossoverLinePoint({ coeffs: coeffsA }, { coeffs: coeffsB }, rng);
  } else {
    // výchozí varianta ('one-point'): klasický jednobodový crossover přes bity genomu
    var genomeA0 = encodeGenome(coeffsA, coeffRange, genomeConfig);
    var genomeB0 = encodeGenome(coeffsB, coeffRange, genomeConfig);
    var childBits0 = crossoverOnePointBits(genomeA0, genomeB0, rng);
    childCoeffsFull = decodeGenome(childBits0, maxParentDegree, coeffRange, genomeConfig);
  }

  return childCoeffsFull.slice(0, childDegree + 1);
}

// Klasický jednobodový crossover přes celý binární řetězec (bity všech
// koeficientů dohromady, řez může padnout kamkoliv).
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

// Doménová varianta (spec 4.2): každý koeficient nezávisle padne na 50:50
// celý (ne po bitech) od jednoho nebo druhého rodiče — "uniformní křížení
// po celých parametrech".
function crossoverParamAlternate(parentA, parentB, rng) {
  var childCoeffs = [];
  var i = 0;
  while (i < parentA.coeffs.length) {
    if (randomChance(rng, 0.5)) {
      childCoeffs.push(parentA.coeffs[i]);
    } else {
      childCoeffs.push(parentB.coeffs[i]);
    }
    i = i + 1;
  }
  return childCoeffs;
}

// Doménová varianta (spec 4.2): potomek je náhodný bod na úsečce mezi
// vektory koeficientů obou rodičů, s náhodným t ∈ [0, 1] (lineární
// interpolace — analogie geometrického křížení z EvoMice spec 6a).
function crossoverLinePoint(parentA, parentB, rng) {
  var t = rng();
  var childCoeffs = [];
  var i = 0;
  while (i < parentA.coeffs.length) {
    var value = parentA.coeffs[i] + t * (parentB.coeffs[i] - parentA.coeffs[i]);
    childCoeffs.push(value);
    i = i + 1;
  }
  return childCoeffs;
}

// --- Mutace ----------------------------------------------------------------
//
// Bitová varianta (spec 4.1: bit-flip s pravděpodobností p_mutace) +
// doménová varianta (spec 4.2: "drobná změna" — malý gaussovský posun).

function mutate(coeffs, params, coeffRange, rng) {
  var mutatedCoeffs = params.mutationType === 'gaussian-jump'
    ? mutateGaussianJump(coeffs, coeffRange, params.mutationSigma, rng)
    : mutateBitFlip(coeffs, params, coeffRange, rng); // výchozí ('bit-flip')

  // Spec 6: stupeň jako součást genomu — samostatný "meta-mutace" krok navíc
  // k mutaci koeficientů výš, nezávislý na tom, jestli je zvolená bitová
  // nebo doménová varianta (obě mutují jen KOEFICIENTY, ne délku vektoru).
  if (params.degreeEvolves) {
    mutatedCoeffs = mutateDegree(mutatedCoeffs, params, coeffRange, rng);
  }
  return mutatedCoeffs;
}

// Bit-flip mutace odvozuje kódovaný stupeň z DÉLKY vektoru koeficientů
// (coeffs.length - 1), ne z params.degree přímo — když degreeEvolves není
// zapnuté, jsou to vždycky stejná čísla (populace sdílí jeden stupeň), takže
// se chování nemění; když JE zapnuté, každý jedinec může mít jiný aktuální
// stupeň a mutace bitů nesmí měnit DÉLKU genomu (o to se stará mutateDegree
// jako samostatný krok, viz mutate() výš).
function mutateBitFlip(coeffs, params, coeffRange, rng) {
  var genomeConfig = genomeConfigFromParams(params);
  var currentDegree = coeffs.length - 1;
  var genome = encodeGenome(coeffs, coeffRange, genomeConfig);
  var i = 0;
  while (i < genome.length) {
    if (randomChance(rng, params.mutationRate)) {
      if (genome[i] === 0) {
        genome[i] = 1;
      } else {
        genome[i] = 0;
      }
    }
    i = i + 1;
  }
  return decodeGenome(genome, currentDegree, coeffRange, genomeConfig);
}

// Spec 6: mutace "meta-parametru" stupně — s pravděpodobností
// degreeMutationRate se stupeň posune o ±1 (v rámci [0, params.degree],
// params.degree je v tomhle režimu STROP, ne pevná hodnota, viz
// createDefaultGaParams). Růst přidá jeden nový náhodný koeficient
// nejvyššího řádu, pokles poslední koeficient prostě zahodí.
function mutateDegree(coeffs, params, coeffRange, rng) {
  if (!randomChance(rng, params.degreeMutationRate)) {
    return coeffs;
  }
  var currentDegree = coeffs.length - 1;
  var direction = randomChance(rng, 0.5) ? 1 : -1;
  var newDegree = clampNumber(currentDegree + direction, 0, params.degree);
  if (newDegree === currentDegree) {
    return coeffs;
  }
  if (newDegree > currentDegree) {
    var grownCoeffs = coeffs.slice();
    grownCoeffs.push(randomRange(rng, -coeffRange, coeffRange));
    return grownCoeffs;
  }
  return coeffs.slice(0, newDegree + 1);
}

// Každý koeficient se posune o malý náhodný vektor (gaussovské rozdělení,
// směrodatná odchylka mutationSigma) místo náhodného převrácení bitů genomu.
function mutateGaussianJump(coeffs, coeffRange, mutationSigma, rng) {
  var mutated = [];
  var i = 0;
  while (i < coeffs.length) {
    var jumped = coeffs[i] + randomGaussian(rng) * mutationSigma;
    mutated.push(clampNumber(jumped, -coeffRange, coeffRange));
    i = i + 1;
  }
  return mutated;
}

// --- Inicializace populace ---------------------------------------------

function createRandomIndividual(degree, coeffRange, rng) {
  var coeffs = [];
  var i = 0;
  while (i <= degree) {
    coeffs.push(randomRange(rng, -coeffRange, coeffRange));
    i = i + 1;
  }
  return createIndividual(coeffs);
}

// Spec 6 (degreeEvolves): počáteční jedinec dostane náhodný stupeň mezi 0 a
// maxDegree (rovnoměrně) místo pevného stupně — ať populace hned od startu
// pokrývá celé rozpětí, ne jen jeden stupeň, který by se pak musel teprve
// "objevit" mutací.
function createRandomIndividualVariableDegree(maxDegree, coeffRange, rng) {
  var degree = randomInt(rng, maxDegree + 1); // 0..maxDegree
  return createRandomIndividual(degree, coeffRange, rng);
}

function createRandomPopulation(size, degree, coeffRange, rng, degreeEvolves) {
  var population = [];
  var i = 0;
  while (i < size) {
    population.push(
      degreeEvolves
        ? createRandomIndividualVariableDegree(degree, coeffRange, rng)
        : createRandomIndividual(degree, coeffRange, rng)
    );
    i = i + 1;
  }
  return population;
}

// --- Self-testy --------------------------------------------------------
//
// Stejný styl jako EvoMice: ověřujeme evoluční jádro přes konzoli, na
// natvrdo nastavených hodnotách (žádné UI zatím, to přijde ve fázi 6).

function runGaSelfTests() {
  var testsRun = 0;
  var rng = createRng(1234);
  var testCoeffRange = 20; // libovolná kladná hodnota, testy rozsah samy neřeší

  // --- Fitness -------------------------------------------------------
  var perfectPoints = [{ x: 0, y: 5 }, { x: 10, y: 5 }];
  var perfectIndividual = createIndividual([5]);
  var badIndividual = createIndividual([-5]);
  computeFitness([perfectIndividual, badIndividual], perfectPoints, 'sse');
  console.assert(perfectIndividual.fitness === 1, 'computeFitness: přesná shoda (chyba 0) má dát fitness 1');
  console.assert(badIndividual.fitness < perfectIndividual.fitness, 'computeFitness: horší shoda má mít nižší fitness');
  testsRun = testsRun + 2;

  // --- Křížení: všech 5 variant musí vrátit vektor koeficientů správné délky ---
  var parentA = createIndividual([2, -3, 1]);
  var parentB = createIndividual([-4, 7, -2]);
  var degreeForParents = parentA.coeffs.length - 1;
  var crossoverTypes = ['one-point', 'multi-point', 'uniform', 'param-alternate', 'line-point'];
  var typeIndex = 0;
  while (typeIndex < crossoverTypes.length) {
    var crossParams = createDefaultGaParams();
    crossParams.crossoverType = crossoverTypes[typeIndex];
    crossParams.degree = degreeForParents;
    var trial = 0;
    while (trial < 20) {
      var child = crossover(parentA, parentB, crossParams, testCoeffRange, rng);
      console.assert(
        child.length === parentA.coeffs.length,
        'crossover (' + crossParams.crossoverType + '): špatná délka vektoru koeficientů'
      );
      testsRun = testsRun + 1;
      trial = trial + 1;
    }
    typeIndex = typeIndex + 1;
  }

  // --- Mutace: obě varianty musí vrátit vektor koeficientů uvnitř rozsahu ---
  var mutationTypes = ['bit-flip', 'gaussian-jump'];
  var mutIndex = 0;
  while (mutIndex < mutationTypes.length) {
    var mutParams = createDefaultGaParams();
    mutParams.mutationType = mutationTypes[mutIndex];
    mutParams.mutationRate = 0.5; // vyšší šance na projevení mutace v testu
    mutParams.mutationSigma = 3;
    mutParams.degree = 2;
    var mtrial = 0;
    while (mtrial < 20) {
      var mutated = mutate([1, -1, 0.5], mutParams, testCoeffRange, rng);
      console.assert(mutated.length === 3, 'mutate (' + mutParams.mutationType + '): špatná délka vektoru koeficientů');
      var withinRange = true;
      var mi = 0;
      while (mi < mutated.length) {
        if (mutated[mi] < -testCoeffRange - 1e-9 || mutated[mi] > testCoeffRange + 1e-9) {
          withinRange = false;
        }
        mi = mi + 1;
      }
      console.assert(withinRange, 'mutate (' + mutParams.mutationType + '): koeficient mimo povolený rozsah');
      testsRun = testsRun + 2;
      mtrial = mtrial + 1;
    }
    mutIndex = mutIndex + 1;
  }

  // --- Selekce: obě metody vrací jedince z populace ----------------------
  var population = createRandomPopulation(30, 2, testCoeffRange, rng);
  computeFitness(population, perfectPoints, 'sse');

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

  // --- stepGeneration: velikost populace se nesmí měnit napříč libovolnou --
  // kombinací náhrady generace / typu křížení / typu mutace ----------------
  var replacementModes = ['full', 'partial'];
  var crossoverKinds = ['one-point', 'line-point'];
  var mutationKinds = ['bit-flip', 'gaussian-jump'];
  var rmIndex = 0;
  while (rmIndex < replacementModes.length) {
    var ckIndex = 0;
    while (ckIndex < crossoverKinds.length) {
      var mkIndex = 0;
      while (mkIndex < mutationKinds.length) {
        var stepParams = createDefaultGaParams();
        stepParams.degree = 2;
        stepParams.replacementMode = replacementModes[rmIndex];
        stepParams.replacementPercent = 30;
        stepParams.crossoverType = crossoverKinds[ckIndex];
        stepParams.mutationType = mutationKinds[mkIndex];
        stepParams.eliteCount = 2;

        var testPopulation = createRandomPopulation(25, 2, testCoeffRange, rng);
        var testPoints = [{ x: 1, y: 2 }, { x: 5, y: -3 }, { x: 9, y: 4 }];

        var gen = 0;
        while (gen < 5) {
          testPopulation = stepGeneration(testPopulation, testPoints, stepParams, rng);
          console.assert(
            testPopulation.length === 25,
            'stepGeneration: velikost populace se nesmí měnit (' + stepParams.replacementMode + '/' +
              stepParams.crossoverType + '/' + stepParams.mutationType + ')'
          );
          gen = gen + 1;
        }
        testsRun = testsRun + 5;

        mkIndex = mkIndex + 1;
      }
      ckIndex = ckIndex + 1;
    }
    rmIndex = rmIndex + 1;
  }

  // --- Elitismus: elitní jedinec (nejlepší fitness) musí přežít beze změny -
  var eliteParams = createDefaultGaParams();
  eliteParams.degree = 0;
  eliteParams.eliteCount = 1;
  eliteParams.replacementMode = 'full';
  var eliteBest = createIndividual([5]); // přesně sedí na bodech níže
  var eliteRest = createRandomPopulation(9, 0, testCoeffRange, rng);
  var elitePopulation = [eliteBest].concat(eliteRest);
  var elitePoints = [{ x: 0, y: 5 }, { x: 10, y: 5 }];
  var eliteResult = stepGeneration(elitePopulation, elitePoints, eliteParams, rng);
  console.assert(
    eliteResult.indexOf(eliteBest) !== -1,
    'stepGeneration: elitní (nejlepší) jedinec musí přežít beze změny do další generace'
  );
  testsRun = testsRun + 1;

  // --- Random seed: stejný seed musí dát stejnou počáteční populaci -------
  var seedA = createRng(777);
  var seedB = createRng(777);
  var popA = createRandomPopulation(10, 3, testCoeffRange, seedA);
  var popB = createRandomPopulation(10, 3, testCoeffRange, seedB);
  var same = true;
  var si = 0;
  while (si < popA.length) {
    var ci = 0;
    while (ci < popA[si].coeffs.length) {
      if (popA[si].coeffs[ci] !== popB[si].coeffs[ci]) {
        same = false;
      }
      ci = ci + 1;
    }
    si = si + 1;
  }
  console.assert(same, 'random seed: stejný seed musí dát stejnou náhodnou populaci');
  testsRun = testsRun + 1;

  // --- Spec 6: stupeň jako součást genomu ---------------------------------

  // padCoeffsToDegree: doplní nulami, nikdy nezkrátí.
  console.assert(
    padCoeffsToDegree([1, 2], 4).join(',') === '1,2,0,0,0',
    'padCoeffsToDegree: musí doplnit nulami na požadovaný stupeň'
  );
  console.assert(
    padCoeffsToDegree([1, 2, 3], 1).join(',') === '1,2,3',
    'padCoeffsToDegree: kratší cílový stupeň než vstup nesmí nic zkrátit'
  );
  testsRun = testsRun + 2;

  // createRandomIndividualVariableDegree: stupeň vždy v [0, maxDegree],
  // napříč mnoha vzorky pokrývá i krajní hodnoty (ne jen prostřední).
  var variableDegreeRng = createRng(555);
  var seenDegrees = {};
  var vTrial = 0;
  while (vTrial < 200) {
    var variableIndividual = createRandomIndividualVariableDegree(4, testCoeffRange, variableDegreeRng);
    var individualDegree = variableIndividual.coeffs.length - 1;
    console.assert(
      individualDegree >= 0 && individualDegree <= 4,
      'createRandomIndividualVariableDegree: stupeň musí být v [0, maxDegree]'
    );
    seenDegrees[individualDegree] = true;
    testsRun = testsRun + 1;
    vTrial = vTrial + 1;
  }
  console.assert(
    seenDegrees[0] && seenDegrees[4],
    'createRandomIndividualVariableDegree: 200 vzorků by mělo pokrýt i krajní stupně 0 a maxDegree'
  );
  testsRun = testsRun + 1;

  // mutateDegree: s pravděpodobností 1 se stupeň vždy posune o přesně ±1
  // (v mezích), s pravděpodobností 0 se nikdy nezmění.
  var degreeMutateParams = createDefaultGaParams();
  degreeMutateParams.degree = 4; // strop
  degreeMutateParams.degreeMutationRate = 1;
  var midDegreeRng = createRng(9001);
  var midDegreeCoeffs = [1, 2, 3]; // stupeň 2, uprostřed rozsahu [0,4]
  var dTrial = 0;
  while (dTrial < 20) {
    var afterMutation = mutateDegree(midDegreeCoeffs, degreeMutateParams, testCoeffRange, midDegreeRng);
    console.assert(
      Math.abs((afterMutation.length - 1) - 2) === 1,
      'mutateDegree (rate=1): stupeň se musí posunout o přesně ±1'
    );
    testsRun = testsRun + 1;
    dTrial = dTrial + 1;
  }
  degreeMutateParams.degreeMutationRate = 0;
  var neverRng = createRng(9002);
  var unchanged = mutateDegree(midDegreeCoeffs, degreeMutateParams, testCoeffRange, neverRng);
  console.assert(unchanged.length === midDegreeCoeffs.length, 'mutateDegree (rate=0): stupeň se nesmí nikdy změnit');
  testsRun = testsRun + 1;

  // mutateDegree: musí respektovat meze [0, params.degree] (strop i dno).
  var lowBoundaryParams = createDefaultGaParams();
  lowBoundaryParams.degree = 4;
  lowBoundaryParams.degreeMutationRate = 1;
  var lowBoundaryRng = createRng(123);
  var atZero = mutateDegree([7], lowBoundaryParams, testCoeffRange, lowBoundaryRng); // stupeň 0, nemůže klesnout níž
  console.assert(atZero.length - 1 >= 0, 'mutateDegree: stupeň nesmí klesnout pod 0');
  var highBoundaryRng = createRng(456);
  var atMax = mutateDegree([1, 2, 3, 4, 5], lowBoundaryParams, testCoeffRange, highBoundaryRng); // stupeň 4 = strop
  console.assert(atMax.length - 1 <= 4, 'mutateDegree: stupeň nesmí přesáhnout strop (params.degree)');
  testsRun = testsRun + 2;

  // crossover s degreeEvolves=true: rodiče různého stupně, potomek musí mít
  // stupeň PŘESNĚ jednoho z rodičů (spec 6: "převzetí od jednoho z rodičů"),
  // ne nějakou interpolaci/průměr.
  var shortParent = createIndividual([1, 2]);      // stupeň 1
  var longParent = createIndividual([3, 4, 5, 6]); // stupeň 3
  var crossDegreeParams = createDefaultGaParams();
  crossDegreeParams.degreeEvolves = true;
  crossDegreeParams.degree = 5; // strop, nesouvisí přímo s testem
  var crossDegreeRng = createRng(2024);
  var possibleChildDegrees = {};
  var cdTrial = 0;
  while (cdTrial < 40) {
    var childOfMixedDegree = crossover(shortParent, longParent, crossDegreeParams, testCoeffRange, crossDegreeRng);
    var childDeg = childOfMixedDegree.length - 1;
    console.assert(
      childDeg === 1 || childDeg === 3,
      'crossover (degreeEvolves): stupeň potomka musí být přesně stupeň jednoho z rodičů (1 nebo 3), ne ' + childDeg
    );
    possibleChildDegrees[childDeg] = true;
    testsRun = testsRun + 1;
    cdTrial = cdTrial + 1;
  }
  console.assert(
    possibleChildDegrees[1] && possibleChildDegrees[3],
    'crossover (degreeEvolves): 40 pokusů by mělo vidět oba možné zděděné stupně'
  );
  testsRun = testsRun + 1;

  // crossover s degreeEvolves=false (výchozí): i když by coeffs náhodou
  // měly různou délku, výsledek se řídí params.degree (zpětná kompatibilita).
  var fixedDegreeParams = createDefaultGaParams();
  fixedDegreeParams.degree = 2;
  var fixedDegreeChild = crossover(createIndividual([1, 2, 3]), createIndividual([4, 5, 6]), fixedDegreeParams, testCoeffRange, rng);
  console.assert(fixedDegreeChild.length === 3, 'crossover (degreeEvolves=false): délka se řídí params.degree');
  testsRun = testsRun + 1;

  console.log('CurveFitEA: GA self-test hotov (' + testsRun + ' dílčích ověření). ' +
    'Pokud výše nejsou žádné "Assertion failed" zprávy, vše je v pořádku.');
}

runGaSelfTests();
