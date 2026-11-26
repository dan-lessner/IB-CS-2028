// EvoMice — jednoduchý seedovatelný generátor náhodných čísel.
//
// Prohlížeč nabízí Math.random(), ale ten nejde seedovat, takže by nešlo
// zopakovat stejný běh simulace. Proto používáme vlastní malý generátor
// (algoritmus "mulberry32") — deterministický, čitelný, žádné externí knihovny.

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
