// CurveFitEA — jednoduchý seedovatelný generátor náhodných čísel.
//
// Prohlížeč nabízí Math.random(), ale ten nejde seedovat, takže by nešlo
// zopakovat stejný běh evoluce. Proto používáme vlastní malý generátor
// (algoritmus "mulberry32") — deterministický, čitelný, žádné externí
// knihovny. (Stejný soubor jako EvoMice — beze změny.)

// Vytvoří generátor s daným celočíselným seedem.
// Vrací funkci bez parametrů, která při každém volání vrátí další
// náhodné číslo v rozsahu [0, 1).
function createRng(seed) {
  var state = seed >>> 0; // celé číslo bez znaménka, 32 bitů

  function next() {
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return next;
}

// Pomocná funkce: náhodné celé číslo z rozsahu [0, maxExclusive) pomocí daného rng.
function randomInt(rng, maxExclusive) {
  var r = rng();
  return Math.floor(r * maxExclusive);
}

// Pomocná funkce: vrátí true s pravděpodobností p (0..1).
function randomChance(rng, p) {
  return rng() < p;
}

// Pomocná funkce: náhodné reálné číslo v rozsahu [minValue, maxValue).
function randomRange(rng, minValue, maxValue) {
  return minValue + rng() * (maxValue - minValue);
}

// Náhodné číslo z (přibližně) normálního rozdělení, střed 0, směrodatná
// odchylka 1 (Box-Muller transformace) — používá doménová mutace (posun
// koeficientu o "malou náhodnou odchylku", spec CurveFitEA 4.2) místo
// rovnoměrného rozdělení, ať jsou malé posuny výrazně pravděpodobnější než
// velké skoky.
function randomGaussian(rng) {
  var u1 = Math.max(rng(), 1e-12); // vyhnout se log(0)
  var u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
