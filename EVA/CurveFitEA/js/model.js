// CurveFitEA — datový model: doména bodů, polynom, kódování koeficientů
// do genomu (bitová varianta) a generování počáteční sady bodů.
//
// Genom jedince = koeficienty polynomu daného stupně. Na rozdíl od EvoMice
// (kde genom/souřadnice byly dvě strany téže mince uložené v jednom objektu)
// tu žádný "genome" pole bitů v jedinci trvale nežije — bitové operátory
// (js/ga.js) si ho podle potřeby zakódují z koeficientů a zase dekódují
// zpátky, protože kódování je deterministické (viz encodeGenome/decodeGenome
// níže). Jedinec je tak jen { coeffs, fitness, error } — o nic jednodušší to
// být nemůže.

// --- Doména x (spec: "1 = přímka je výchozí/speciální případ") ------------
//
// Pevná, neměnná doména osy x — reset mění jen body a populaci, ne rozsah
// x. Osa y (WORLD.yMin/yMax) se dopočítává z aktuálních bodů, viz
// computeWorldYRange() níže.
var WORLD_X_MIN = 0;
var WORLD_X_MAX = 10;

// --- Normalizace x pro vyhodnocení polynomu -------------------------------
//
// Rozhodnutí (viz PROGRESS.md): polynom se vyhodnocuje v normalizované
// souřadnici u = (x - střed) / polovina_rozsahu ∈ [-1, 1], ne přímo v x.
// Bez týhle normalizace by vyšší mocniny (x^4, x^5...) na doméně [0, 10]
// "vybuchovaly" a každý koeficient vyššího řádu by potřeboval o řády menší
// rozsah než ten předchozí — komplikovalo by to bitové kódování (jeden
// sdílený rozsah pro všechny koeficienty) i UI. Díky u ∈ [-1, 1] mají
// všechny koeficienty srovnatelný vliv na výslednou hodnotu bez ohledu na
// stupeň polynomu.
function normalizeX(x) {
  var mid = (WORLD_X_MIN + WORLD_X_MAX) / 2;
  var halfSpan = (WORLD_X_MAX - WORLD_X_MIN) / 2;
  return (x - mid) / halfSpan;
}

// Vyhodnotí polynom daný koeficienty (coeffs[i] = koeficient u^i) v bodě x.
function evaluatePolynomial(coeffs, x) {
  var u = normalizeX(x);
  var result = 0;
  var uPower = 1;
  var i = 0;
  while (i < coeffs.length) {
    result = result + coeffs[i] * uPower;
    uPower = uPower * u;
    i = i + 1;
  }
  return result;
}

// --- Rozsah koeficientů ----------------------------------------------------
//
// Není to trvale uložená hodnota, ale odvozená z aktuálních bodů (viz
// PROGRESS.md) — dost velký na to, aby evoluce měla rozumný prostor k
// hledání, ale ne zbytečně velký (zbytečně velký rozsah = zbytečně hrubé
// bitové kódování při daném počtu bitů na koeficient).
var MIN_COEFF_RANGE = 10;
var COEFF_RANGE_MARGIN_FACTOR = 3;

function computeCoeffRange(points) {
  if (points.length === 0) {
    return MIN_COEFF_RANGE;
  }
  var maxAbsY = 0;
  var i = 0;
  while (i < points.length) {
    var absY = Math.abs(points[i].y);
    if (absY > maxAbsY) {
      maxAbsY = absY;
    }
    i = i + 1;
  }
  return Math.max(MIN_COEFF_RANGE, COEFF_RANGE_MARGIN_FACTOR * maxAbsY);
}

// --- Reprezentace genomu (spec 5) — dvě nezávislé osy nastavení ------------
//
// Didaktický cíl (viz spec 5 úvod): umožnit narazit na situace, kdy evoluce
// selže ne kvůli špatné strategii, ale kvůli nevhodně zvolenému KÓDOVÁNÍ.
//
// 5.1 Transformace: 'direct' kóduje každý koeficient se stejným sdíleným
// rozsahem (coeffRange) bez ohledu na jeho řád — u vyšších stupňů polynomu
// nutí koeficienty vysokých mocnin (typicky mnohem menší co do velikosti po
// normalizaci x, viz normalizeX výš) sdílet stejně hrubé rozlišení jako
// koeficient nultého řádu. 'normalized' naopak rozsah/přesnost i-tého
// koeficientu geometricky zužuje s rostoucím řádem — lépe odpovídá
// typickému měřítku vyšších koeficientů a dovoluje jemnější rozlišení tam,
// kde na tom obvykle víc záleží.
var GENOME_TRANSFORM_DECAY = 3; // 'normalized': rozsah i-tého koeficientu = coeffRange / DECAY^i

function coeffRangeForIndex(coeffRange, index, transform) {
  if (transform === 'normalized') {
    return coeffRange / Math.pow(GENOME_TRANSFORM_DECAY, index);
  }
  return coeffRange; // 'direct' (výchozí)
}

// 5.2 Číselná reprezentace — týká se jen BITOVÉHO kódování (doménová
// varianta v ga.js pracuje vždy přímo s plnou přesností JS float, spec 4.2
// nic jiného nezmiňuje). 'integer' použije jen tolik bitů, kolik je potřeba
// na celá čísla v daném rozsahu (žádná desetinná místa vůbec), 'fixed'
// použije nastavitelný počet bitů (méně bitů = hrubší rozlišení při
// zachování celého rozsahu — kompromis rozsah/přesnost při fixním počtu
// bitů), 'float' je výchozí jemné rozlišení (BITS_PER_COEFF_FLOAT bitů).
var BITS_PER_COEFF_FLOAT = 16;
var DEFAULT_FIXED_BITS = 8;

function createDefaultGenomeConfig() {
  return { transform: 'direct', numeric: 'float', fixedBits: DEFAULT_FIXED_BITS };
}

// Kolik bitů potřebuje jeden koeficient s daným (efektivním, už
// transformovaným) rozsahem a zvolenou číselnou reprezentací.
function bitsForCoeff(coeffRange, numeric, fixedBits) {
  if (numeric === 'integer') {
    var rangeInt = Math.max(1, Math.round(coeffRange));
    return Math.max(1, Math.ceil(Math.log2(2 * rangeInt + 1)));
  }
  if (numeric === 'fixed') {
    return Math.max(1, Math.round(fixedBits));
  }
  return BITS_PER_COEFF_FLOAT; // 'float' (výchozí)
}

// --- Zápis/čtení celého nezáporného čísla do/z pole bitů (sdílená pomocná
// funkce pro obě větve kódování níže) ---------------------------------------
function writeUnsignedIntToBits(value, bitCount) {
  var bits = new Array(bitCount);
  var remaining = value;
  var i = bitCount - 1;
  while (i >= 0) {
    bits[i] = remaining % 2;
    remaining = Math.floor(remaining / 2);
    i = i - 1;
  }
  return bits;
}

function readUnsignedIntFromBits(bits, startIndex, bitCount) {
  var value = 0;
  var i = 0;
  while (i < bitCount) {
    value = value * 2 + bits[startIndex + i];
    i = i + 1;
  }
  return value;
}

// Zakóduje jeden koeficient do bitů podle zvolené číselné reprezentace.
// 'integer': přímo celé číslo (posunuté do nezáporného rozsahu) — žádná
// kvantovací mřížka navíc, dekódovaná hodnota je vždy PŘESNĚ to zaokrouhlené
// celé číslo. 'fixed'/'float': rovnoměrné kvantování celého rozsahu
// [-coeffRange, coeffRange] do 2^bitCount kroků — liší se jen počtem bitů
// (tedy hrubostí kroku), mechanika je stejná jako dřív.
function encodeCoeffToBits(value, coeffRange, numeric, fixedBits) {
  var bitCount = bitsForCoeff(coeffRange, numeric, fixedBits);

  if (numeric === 'integer') {
    var rangeInt = Math.max(1, Math.round(coeffRange));
    var clampedInt = clampNumber(Math.round(value), -rangeInt, rangeInt);
    return writeUnsignedIntToBits(clampedInt + rangeInt, bitCount);
  }

  var maxInt = Math.pow(2, bitCount) - 1;
  var clamped = clampNumber(value, -coeffRange, coeffRange);
  var ratio = (clamped + coeffRange) / (2 * coeffRange); // 0..1
  return writeUnsignedIntToBits(Math.round(ratio * maxInt), bitCount);
}

function decodeBitsToCoeff(bits, startIndex, coeffRange, numeric, fixedBits) {
  var bitCount = bitsForCoeff(coeffRange, numeric, fixedBits);
  var unsignedValue = readUnsignedIntFromBits(bits, startIndex, bitCount);

  if (numeric === 'integer') {
    var rangeInt = Math.max(1, Math.round(coeffRange));
    return unsignedValue - rangeInt;
  }

  var maxInt = Math.pow(2, bitCount) - 1;
  var ratio = unsignedValue / maxInt; // 0..1
  return -coeffRange + ratio * 2 * coeffRange;
}

// Zakóduje celý vektor koeficientů do jednoho genomu (pole bitů). Šířka
// bloku se počítá zvlášť pro každý koeficient (coeffRangeForIndex +
// bitsForCoeff) — u transformace 'normalized' proto mají vyšší řády kratší
// blok (menší efektivní rozsah = potřeba míň bitů i u stejné číselné
// reprezentaci). `genomeConfig` je nepovinné (chybí-li, použije se
// createDefaultGenomeConfig() — 'direct'/'float', tedy přesně dřívější
// chování před spec 5).
function encodeGenome(coeffs, coeffRange, genomeConfig) {
  var config = genomeConfig || createDefaultGenomeConfig();
  var genome = [];
  var i = 0;
  while (i < coeffs.length) {
    var rangeForThisCoeff = coeffRangeForIndex(coeffRange, i, config.transform);
    genome = genome.concat(encodeCoeffToBits(coeffs[i], rangeForThisCoeff, config.numeric, config.fixedBits));
    i = i + 1;
  }
  return genome;
}

// Dekóduje genom zpět na vektor koeficientů (degree+1 hodnot) — musí projít
// koeficienty ve STEJNÉM pořadí a se STEJNOU konfigurací jako encodeGenome,
// ať offsety bloků v bitovém poli sedí (šířka bloku může být pro každý
// koeficient jiná, viz výš).
function decodeGenome(genome, degree, coeffRange, genomeConfig) {
  var config = genomeConfig || createDefaultGenomeConfig();
  var coeffs = [];
  var offset = 0;
  var i = 0;
  while (i <= degree) {
    var rangeForThisCoeff = coeffRangeForIndex(coeffRange, i, config.transform);
    coeffs.push(decodeBitsToCoeff(genome, offset, rangeForThisCoeff, config.numeric, config.fixedBits));
    offset = offset + bitsForCoeff(rangeForThisCoeff, config.numeric, config.fixedBits);
    i = i + 1;
  }
  return coeffs;
}

function clampNumber(value, minValue, maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

// --- Jedinec (kandidátní křivka) -------------------------------------------

function createIndividual(coeffs) {
  return { coeffs: coeffs, fitness: 0, error: 0 };
}

// --- Chyba (fitness metrika) — spec 1 a spec 7: SSE výchozí, další na výběr -
//
// 'sse' a 'mae' jsou klasické spojité chybové metriky (čím míň, tím líp,
// hladký gradient směrem k lepšímu řešení). 'max-error' je taky spojitá
// (nejhorší jednotlivá odchylka), ale citlivá jen na nejhůř trefený bod —
// ignoruje, jak dobře sedí všechny ostatní. 'hit-count' je záměrně
// "objevná" metrika (spec 7): na první pohled dává smysl ("kolik bodů
// křivka trefila"), ale nerozlišuje kvalitu mezi netrefenými body vůbec —
// dokud se bod nedostane do tolerance, je úplně jedno, jestli je od křivky
// o kousek nebo o hony (žádný gradient). Necháváme to studenty objevit
// sami (stejná filozofie jako EvoMice tooltips — mechanismus se vysvětlí,
// důsledek ne), proto tolerance je jediný parametr, se kterým sami zkusí
// pohnout.
//
// `tolerance` se používá jen pro 'hit-count' (vzdálenost bod<->křivka, do
// které je bod považovaný za "trefený").
function computeError(coeffs, points, metricType, tolerance) {
  if (points.length === 0) {
    return 0;
  }

  if (metricType === 'hit-count') {
    return points.length - countHitPoints(coeffs, points, tolerance);
  }

  var sumSquares = 0;
  var sumAbs = 0;
  var maxAbs = 0;
  var i = 0;
  while (i < points.length) {
    var predicted = evaluatePolynomial(coeffs, points[i].x);
    var diff = predicted - points[i].y;
    var absDiff = Math.abs(diff);
    sumSquares = sumSquares + diff * diff;
    sumAbs = sumAbs + absDiff;
    if (absDiff > maxAbs) {
      maxAbs = absDiff;
    }
    i = i + 1;
  }
  if (metricType === 'mae') {
    return sumAbs / points.length;
  }
  if (metricType === 'max-error') {
    return maxAbs;
  }
  return sumSquares; // 'sse' (výchozí)
}

// Kolik bodů je od křivky vzdáleno nejvýš `tolerance` (spec 7: "počet
// trefených bodů, s nastavitelnou tolerancí").
function countHitPoints(coeffs, points, tolerance) {
  var hitCount = 0;
  var i = 0;
  while (i < points.length) {
    var predicted = evaluatePolynomial(coeffs, points[i].x);
    if (Math.abs(predicted - points[i].y) <= tolerance) {
      hitCount = hitCount + 1;
    }
    i = i + 1;
  }
  return hitCount;
}

// Součet čtverců odchylek — používá se pro vizualizaci "čtverečků" u
// zvýrazněné křivky (spec bod 2) vždy jako SSE, bez ohledu na to, jaká
// metrika zrovna pohání evoluci (čtverce samy o sobě dávají smysl jen pro
// druhou mocninu odchylky).
function computeSumOfSquares(coeffs, points) {
  return computeError(coeffs, points, 'sse');
}

// --- Skrytý referenční model + generování počáteční sady bodů (spec 2) ----
//
// Stupeň skrytého modelu je nezávislý na stupni polynomu, který si zvolí
// uživatel pro fitování (viz PROGRESS.md) — schválně, ať jde pozorovat
// podfitování i přefitování.
var HIDDEN_MODEL_MIN_DEGREE = 1;
var HIDDEN_MODEL_MAX_DEGREE = 3;
var HIDDEN_COEFF_SCALE = 6;
var INITIAL_POINT_COUNT = 14;
var NOISE_SIGMA_RATIO = 0.12; // podíl z rozpětí hodnot skryté křivky
var NOISE_SIGMA_MIN = 0.4;
var Y_RANGE_MARGIN_RATIO = 0.2;
var Y_RANGE_MIN_SPAN = 2;

function generateHiddenCoeffs(rng) {
  var degree = HIDDEN_MODEL_MIN_DEGREE + randomInt(rng, HIDDEN_MODEL_MAX_DEGREE - HIDDEN_MODEL_MIN_DEGREE + 1);
  var coeffs = [];
  var i = 0;
  while (i <= degree) {
    coeffs.push(randomRange(rng, -HIDDEN_COEFF_SCALE, HIDDEN_COEFF_SCALE));
    i = i + 1;
  }
  return coeffs;
}

// Rozpětí hodnot skryté křivky přes celou doménu (pro odhad síly šumu) —
// prostý vzorek, ne analytické hledání extrému (pro polynom nízkého stupně
// na krátké doméně dostatečně přesné pro tenhle účel).
function estimateCurveRange(coeffs) {
  var sampleCount = 30;
  var minValue = Infinity;
  var maxValue = -Infinity;
  var i = 0;
  while (i <= sampleCount) {
    var x = WORLD_X_MIN + (i / sampleCount) * (WORLD_X_MAX - WORLD_X_MIN);
    var y = evaluatePolynomial(coeffs, x);
    if (y < minValue) {
      minValue = y;
    }
    if (y > maxValue) {
      maxValue = y;
    }
    i = i + 1;
  }
  return maxValue - minValue;
}

// Vygeneruje počáteční sadu bodů: náhodné x v doméně, y = skrytý model +
// gaussovský šum (spec 2: "referenční křivka + náhodný šum", evoluce skrytý
// model nikdy neuvidí, jen výsledné body).
//
// Souřadnice bodů jsou vždy přirozená čísla (spec 2: "celá, nezáporná" —
// čitelnější pro studenty). Nejdřív se vygenerují syrové (desetinné, možná
// záporné) hodnoty, pak se všechna y posunou tak, aby minimum vyšlo >= 0
// (posun měřítka, nezkresluje TVAR dat na rozdíl od prostého ořezání
// záporných hodnot na 0), a nakonec se zaokrouhlí na celá čísla (x i y).
function generateInitialPoints(rng) {
  var hiddenCoeffs = generateHiddenCoeffs(rng);
  var curveRange = estimateCurveRange(hiddenCoeffs);
  var noiseSigma = Math.max(NOISE_SIGMA_MIN, NOISE_SIGMA_RATIO * curveRange);

  var rawPoints = [];
  var minY = Infinity;
  var i = 0;
  while (i < INITIAL_POINT_COUNT) {
    var x = randomRange(rng, WORLD_X_MIN, WORLD_X_MAX);
    var y = evaluatePolynomial(hiddenCoeffs, x) + randomGaussian(rng) * noiseSigma;
    rawPoints.push({ x: x, y: y });
    if (y < minY) {
      minY = y;
    }
    i = i + 1;
  }

  var yShift = minY < 0 ? -minY : 0;
  var points = [];
  var j = 0;
  while (j < rawPoints.length) {
    points.push({
      x: Math.round(rawPoints[j].x),
      y: Math.round(rawPoints[j].y + yShift)
    });
    j = j + 1;
  }
  return points;
}

// Rozsah osy y pro vykreslení (spec 14.2 layout používá tohle pro mapování
// world <-> pixel) — dopočítaný z aktuálních bodů s okrajovou rezervou, ne
// z celého (potenciálně mnohem širšího) rozsahu skryté křivky.
function computeWorldYRange(points) {
  if (points.length === 0) {
    return { yMin: -Y_RANGE_MIN_SPAN / 2, yMax: Y_RANGE_MIN_SPAN / 2 };
  }
  var minY = Infinity;
  var maxY = -Infinity;
  var i = 0;
  while (i < points.length) {
    if (points[i].y < minY) {
      minY = points[i].y;
    }
    if (points[i].y > maxY) {
      maxY = points[i].y;
    }
    i = i + 1;
  }
  var span = maxY - minY;
  if (span < Y_RANGE_MIN_SPAN) {
    var mid = (minY + maxY) / 2;
    minY = mid - Y_RANGE_MIN_SPAN / 2;
    maxY = mid + Y_RANGE_MIN_SPAN / 2;
    span = Y_RANGE_MIN_SPAN;
  }
  var margin = span * Y_RANGE_MARGIN_RATIO;
  return { yMin: minY - margin, yMax: maxY + margin };
}

// --- Self-testy -------------------------------------------------------------
//
// Stejný styl jako EvoMice (genome.js/ga.js): ověření přes console.assert,
// spustitelné i přes `node js/model.js` (žádná závislost na DOM).

function runModelSelfTests() {
  var testsRun = 0;

  // Normalizace: krajní body domény musí padnout přesně na -1 / 1, střed na 0.
  console.assert(normalizeX(WORLD_X_MIN) === -1, 'normalizeX: levý okraj domény má být -1');
  console.assert(normalizeX(WORLD_X_MAX) === 1, 'normalizeX: pravý okraj domény má být 1');
  console.assert(normalizeX((WORLD_X_MIN + WORLD_X_MAX) / 2) === 0, 'normalizeX: střed domény má být 0');
  testsRun = testsRun + 3;

  // evaluatePolynomial: konstantní polynom vrací všude stejnou hodnotu.
  console.assert(evaluatePolynomial([5], 0) === 5, 'evaluatePolynomial: konstanta má být všude stejná (x=0)');
  console.assert(evaluatePolynomial([5], 10) === 5, 'evaluatePolynomial: konstanta má být všude stejná (x=10)');
  testsRun = testsRun + 2;

  // evaluatePolynomial: lineární polynom c0 + c1*u, u v krajích ±1.
  var linear = evaluatePolynomial([2, 3], WORLD_X_MAX); // u=1 -> 2 + 3*1 = 5
  console.assert(Math.abs(linear - 5) < 1e-9, 'evaluatePolynomial: lineární polynom v pravém okraji');
  testsRun = testsRun + 1;

  // Bitové kódování koeficientu (spec 5.2): round-trip pro 'fixed'/'float' —
  // rovnoměrné kvantování, tolerance = velikost jednoho kroku mřížky.
  var coeffRangesToTest = [10, 25, 100];
  var valuesToTest = [-100, -25, -10, -1, 0, 0.37, 5, 10, 25, 100];
  var quantizedNumericModes = [
    { numeric: 'float', fixedBits: undefined },
    { numeric: 'fixed', fixedBits: 10 }
  ];
  var qIndex = 0;
  while (qIndex < quantizedNumericModes.length) {
    var qMode = quantizedNumericModes[qIndex];
    var rangeIndex = 0;
    while (rangeIndex < coeffRangesToTest.length) {
      var coeffRange = coeffRangesToTest[rangeIndex];
      var bitCountForMode = bitsForCoeff(coeffRange, qMode.numeric, qMode.fixedBits);
      var valueIndex = 0;
      while (valueIndex < valuesToTest.length) {
        var original = valuesToTest[valueIndex];
        var expected = clampNumber(original, -coeffRange, coeffRange);
        var bits = encodeCoeffToBits(original, coeffRange, qMode.numeric, qMode.fixedBits);
        console.assert(bits.length === bitCountForMode, 'encodeCoeffToBits: délka bitů neodpovídá bitsForCoeff (' + qMode.numeric + ')');
        var decoded = decodeBitsToCoeff(bits, 0, coeffRange, qMode.numeric, qMode.fixedBits);
        var tolerance = (2 * coeffRange) / Math.pow(2, bitCountForMode) + 1e-9;
        console.assert(
          Math.abs(decoded - expected) <= tolerance,
          'encode/decodeCoeff (' + qMode.numeric + ') round-trip mimo toleranci pro hodnotu ' + original + ' (rozsah ' + coeffRange + ')'
        );
        testsRun = testsRun + 2;
        valueIndex = valueIndex + 1;
      }
      rangeIndex = rangeIndex + 1;
    }
    qIndex = qIndex + 1;
  }

  // Bitové kódování koeficientu (spec 5.2): 'integer' musí dát PŘESNĚ to
  // zaokrouhlené celé číslo zpátky, žádná kvantovací tolerance navíc.
  var integerCoeffRanges = [5, 20, 100];
  var integerValuesToTest = [-100, -19.6, -5, -0.4, 0, 0.4, 3, 19.6, 100];
  var irIndex = 0;
  while (irIndex < integerCoeffRanges.length) {
    var intRange = integerCoeffRanges[irIndex];
    var ivIndex = 0;
    while (ivIndex < integerValuesToTest.length) {
      var intOriginal = integerValuesToTest[ivIndex];
      var expectedInt = clampNumber(Math.round(intOriginal), -Math.round(intRange), Math.round(intRange));
      var intBits = encodeCoeffToBits(intOriginal, intRange, 'integer');
      var decodedInt = decodeBitsToCoeff(intBits, 0, intRange, 'integer');
      console.assert(
        decodedInt === expectedInt,
        'encode/decodeCoeff (integer) musí dát přesně zaokrouhlené celé číslo pro ' + intOriginal + ' (rozsah ' + intRange + ')'
      );
      console.assert(Number.isInteger(decodedInt), 'encode/decodeCoeff (integer): výsledek musí být celé číslo');
      testsRun = testsRun + 2;
      ivIndex = ivIndex + 1;
    }
    irIndex = irIndex + 1;
  }

  // coeffRangeForIndex (spec 5.1): 'direct' nemění rozsah, 'normalized' ho
  // geometricky zužuje s rostoucím indexem.
  console.assert(coeffRangeForIndex(30, 0, 'direct') === 30, 'coeffRangeForIndex (direct): index 0 beze změny');
  console.assert(coeffRangeForIndex(30, 4, 'direct') === 30, 'coeffRangeForIndex (direct): i vyšší index beze změny');
  console.assert(coeffRangeForIndex(30, 0, 'normalized') === 30, 'coeffRangeForIndex (normalized): index 0 beze změny (DECAY^0 = 1)');
  console.assert(
    Math.abs(coeffRangeForIndex(30, 2, 'normalized') - 30 / Math.pow(GENOME_TRANSFORM_DECAY, 2)) < 1e-9,
    'coeffRangeForIndex (normalized): rozsah se zužuje geometricky s indexem'
  );
  testsRun = testsRun + 4;

  // Genom celého vektoru koeficientů (spec 5): round-trip pro několik
  // stupňů, napříč všemi kombinacemi transformace × číselné reprezentace.
  var degreesToTest = [0, 1, 2, 5];
  var genomeConfigsToTest = [
    { transform: 'direct', numeric: 'float', fixedBits: 16 },
    { transform: 'direct', numeric: 'fixed', fixedBits: 8 },
    { transform: 'direct', numeric: 'integer', fixedBits: 8 },
    { transform: 'normalized', numeric: 'float', fixedBits: 16 },
    { transform: 'normalized', numeric: 'fixed', fixedBits: 6 },
    { transform: 'normalized', numeric: 'integer', fixedBits: 8 }
  ];
  var configIndex = 0;
  while (configIndex < genomeConfigsToTest.length) {
    var genomeConfig = genomeConfigsToTest[configIndex];
    var degreeIndex = 0;
    while (degreeIndex < degreesToTest.length) {
      var degree = degreesToTest[degreeIndex];
      var coeffs = [];
      var c = 0;
      while (c <= degree) {
        coeffs.push((c + 1) * 1.5 - degree); // jen nějaké různorodé hodnoty
        c = c + 1;
      }
      var genomeCoeffRange = 20;
      var genome = encodeGenome(coeffs, genomeCoeffRange, genomeConfig);

      var expectedLength = 0;
      var lenIndex = 0;
      while (lenIndex <= degree) {
        expectedLength = expectedLength + bitsForCoeff(
          coeffRangeForIndex(genomeCoeffRange, lenIndex, genomeConfig.transform),
          genomeConfig.numeric, genomeConfig.fixedBits
        );
        lenIndex = lenIndex + 1;
      }
      console.assert(
        genome.length === expectedLength,
        'encodeGenome: délka genomu neodpovídá součtu bitsForCoeff napříč koeficienty (' +
          genomeConfig.transform + '/' + genomeConfig.numeric + ')'
      );

      var decodedCoeffs = decodeGenome(genome, degree, genomeCoeffRange, genomeConfig);
      console.assert(decodedCoeffs.length === degree + 1, 'decodeGenome: špatný počet koeficientů');
      var okIndex = 0;
      var allClose = true;
      while (okIndex <= degree) {
        var effectiveRange = coeffRangeForIndex(genomeCoeffRange, okIndex, genomeConfig.transform);
        var clampedOriginal = genomeConfig.numeric === 'integer'
          ? clampNumber(Math.round(coeffs[okIndex]), -Math.round(effectiveRange), Math.round(effectiveRange))
          : clampNumber(coeffs[okIndex], -effectiveRange, effectiveRange);
        var coeffTolerance = genomeConfig.numeric === 'integer'
          ? 1e-9
          : (2 * effectiveRange) / Math.pow(2, bitsForCoeff(effectiveRange, genomeConfig.numeric, genomeConfig.fixedBits)) + 1e-9;
        if (Math.abs(decodedCoeffs[okIndex] - clampedOriginal) > coeffTolerance) {
          allClose = false;
        }
        okIndex = okIndex + 1;
      }
      console.assert(
        allClose,
        'encodeGenome/decodeGenome: round-trip vektoru koeficientů mimo toleranci (' +
          genomeConfig.transform + '/' + genomeConfig.numeric + ', degree ' + degree + ')'
      );
      testsRun = testsRun + 3;
      degreeIndex = degreeIndex + 1;
    }
    configIndex = configIndex + 1;
  }

  // encodeGenome/decodeGenome bez explicitní konfigurace (genomeConfig
  // vynechané) se musí chovat přesně jako createDefaultGenomeConfig()
  // ('direct'/'float') — zpětná kompatibilita se starším voláním.
  var defaultConfigCoeffs = [3.3, -7.7, 1.1];
  var defaultConfigRange = 20;
  var genomeWithDefault = encodeGenome(defaultConfigCoeffs, defaultConfigRange);
  var genomeWithExplicitDefault = encodeGenome(defaultConfigCoeffs, defaultConfigRange, createDefaultGenomeConfig());
  console.assert(
    genomeWithDefault.join(',') === genomeWithExplicitDefault.join(','),
    'encodeGenome: vynechaný genomeConfig se musí chovat jako createDefaultGenomeConfig()'
  );
  testsRun = testsRun + 1;

  // computeError: SSE nulové pro přesně sedící body, MAE taky.
  var perfectCoeffs = [1, 2]; // y = 1 + 2u
  var perfectPoints = [
    { x: WORLD_X_MIN, y: evaluatePolynomial(perfectCoeffs, WORLD_X_MIN) },
    { x: WORLD_X_MAX, y: evaluatePolynomial(perfectCoeffs, WORLD_X_MAX) }
  ];
  console.assert(computeError(perfectCoeffs, perfectPoints, 'sse') < 1e-9, 'computeError (sse): přesná shoda má dát 0');
  console.assert(computeError(perfectCoeffs, perfectPoints, 'mae') < 1e-9, 'computeError (mae): přesná shoda má dát 0');
  testsRun = testsRun + 2;

  // computeError: known odchylka.
  var knownPoints = [{ x: (WORLD_X_MIN + WORLD_X_MAX) / 2, y: evaluatePolynomial([1], 0) + 3 }]; // konstanta 1, bod o 3 výš
  console.assert(Math.abs(computeError([1], knownPoints, 'sse') - 9) < 1e-9, 'computeError (sse): (3)^2 = 9');
  console.assert(Math.abs(computeError([1], knownPoints, 'mae') - 3) < 1e-9, 'computeError (mae): |3| = 3');
  testsRun = testsRun + 2;

  // computeError: prázdná sada bodů nesmí spadnout (dělení nulou) a má dát 0.
  console.assert(computeError([1, 2, 3], [], 'sse') === 0, 'computeError: prázdná sada bodů (sse) má dát 0');
  console.assert(computeError([1, 2, 3], [], 'mae') === 0, 'computeError: prázdná sada bodů (mae) má dát 0');
  console.assert(computeError([1, 2, 3], [], 'hit-count') === 0, 'computeError: prázdná sada bodů (hit-count) má dát 0');
  console.assert(computeError([1, 2, 3], [], 'max-error') === 0, 'computeError: prázdná sada bodů (max-error) má dát 0');
  testsRun = testsRun + 4;

  // computeError (spec 7): max-error a hit-count.
  var mixedCoeffs = [1]; // konstanta 1
  var mixedPoints = [
    { x: WORLD_X_MIN, y: evaluatePolynomial(mixedCoeffs, WORLD_X_MIN) + 0.5 }, // odchylka 0.5
    { x: (WORLD_X_MIN + WORLD_X_MAX) / 2, y: evaluatePolynomial(mixedCoeffs, 0) + 5 }, // odchylka 5
    { x: WORLD_X_MAX, y: evaluatePolynomial(mixedCoeffs, WORLD_X_MAX) } // odchylka 0 (přesná shoda)
  ];
  console.assert(
    Math.abs(computeError(mixedCoeffs, mixedPoints, 'max-error') - 5) < 1e-9,
    'computeError (max-error): musí vrátit největší jednotlivou odchylku'
  );
  console.assert(
    computeError(mixedCoeffs, mixedPoints, 'hit-count', 1) === 1,
    'computeError (hit-count): tolerance 1 -> 2 trefené body ze 3 (odchylky 0.5 a 0), tedy chyba (netrefené) = 1'
  );
  testsRun = testsRun + 2;
  console.assert(
    countHitPoints(mixedCoeffs, mixedPoints, 1) === 2,
    'countHitPoints: s tolerancí 1 mají být trefené body s odchylkou 0.5 a 0 (2 z 3)'
  );
  console.assert(
    countHitPoints(mixedCoeffs, mixedPoints, 10) === 3,
    'countHitPoints: s dost velkou tolerancí jsou trefené všechny body'
  );
  testsRun = testsRun + 2;

  // computeCoeffRange: prázdné body -> minimum; jinak podle max|y|.
  console.assert(computeCoeffRange([]) === MIN_COEFF_RANGE, 'computeCoeffRange: prázdné body mají dát MIN_COEFF_RANGE');
  var rangePoints = [{ x: 0, y: 4 }, { x: 1, y: -50 }, { x: 2, y: 10 }];
  console.assert(
    computeCoeffRange(rangePoints) === COEFF_RANGE_MARGIN_FACTOR * 50,
    'computeCoeffRange: má vycházet z maximální |y| napříč body'
  );
  testsRun = testsRun + 2;

  // generateInitialPoints + computeWorldYRange: stejný seed -> stejný výsledek,
  // správný počet bodů, y-rozsah pokrývá všechny body.
  var rngA = createRng(4242);
  var rngB = createRng(4242);
  var pointsA = generateInitialPoints(rngA);
  var pointsB = generateInitialPoints(rngB);
  console.assert(pointsA.length === INITIAL_POINT_COUNT, 'generateInitialPoints: očekávaný počet bodů');
  var samePoints = true;
  var pi = 0;
  while (pi < pointsA.length) {
    if (pointsA[pi].x !== pointsB[pi].x || pointsA[pi].y !== pointsB[pi].y) {
      samePoints = false;
    }
    pi = pi + 1;
  }
  console.assert(samePoints, 'generateInitialPoints: stejný seed musí dát stejné body');
  testsRun = testsRun + 2;

  // generateInitialPoints (spec 2): souřadnice jsou vždy přirozená čísla
  // (celá, nezáporná) — ověř přes víc různých seedů, ať to není náhoda.
  var naturalSeeds = [1, 2, 3, 1000, 99999];
  var seedIdx = 0;
  while (seedIdx < naturalSeeds.length) {
    var naturalPoints = generateInitialPoints(createRng(naturalSeeds[seedIdx]));
    var np = 0;
    while (np < naturalPoints.length) {
      var point = naturalPoints[np];
      console.assert(
        Number.isInteger(point.x) && Number.isInteger(point.y),
        'generateInitialPoints: souřadnice musí být celá čísla (seed ' + naturalSeeds[seedIdx] + ')'
      );
      console.assert(
        point.x >= 0 && point.y >= 0,
        'generateInitialPoints: souřadnice musí být nezáporné (seed ' + naturalSeeds[seedIdx] + ')'
      );
      testsRun = testsRun + 2;
      np = np + 1;
    }
    seedIdx = seedIdx + 1;
  }

  var yRange = computeWorldYRange(pointsA);
  console.assert(yRange.yMax > yRange.yMin, 'computeWorldYRange: yMax musí být větší než yMin');
  var withinRange = true;
  var yi = 0;
  while (yi < pointsA.length) {
    if (pointsA[yi].y < yRange.yMin || pointsA[yi].y > yRange.yMax) {
      withinRange = false;
    }
    yi = yi + 1;
  }
  console.assert(withinRange, 'computeWorldYRange: všechny body musí padnout do vypočteného rozsahu');
  testsRun = testsRun + 2;

  console.log('CurveFitEA: model self-test hotov (' + testsRun + ' dílčích ověření). ' +
    'Pokud výše nejsou žádné "Assertion failed" zprávy, vše je v pořádku.');
}

runModelSelfTests();

// Node.js nemá console.assert s throw, ale export pro případné budoucí
// testovací skripty přes require() nevadí mít připravený (stejně jako
// EvoMice to neřeší — soubor funguje beze změny v prohlížeči i přes node).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeX: normalizeX,
    evaluatePolynomial: evaluatePolynomial,
    computeError: computeError
  };
}
