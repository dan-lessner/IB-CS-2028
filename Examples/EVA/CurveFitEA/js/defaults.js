// CurveFitEA — centralizace výchozích hodnot nastavení + tlačítko reset na
// výchozí (sdílená konvence EvoMice spec 13.5).
//
// Na rozdíl od EvoMice tenhle projekt neřeší ukládání/sdílení stavu přes
// cookie nebo odkaz (mimo rozsah CurveFitEA spec, viz PROGRESS.md) — soubor
// se stará jen o jedno místo pravdy pro výchozí hodnoty a jejich aplikaci
// (při startu i na tlačítko "reset na výchozí").
//
// Načítá se jako poslední <script> v index.html (po main.js) — potřebuje
// jeho resetEverything()/refreshSliderDisplays()/... a to, že main.js už
// definoval DOM posluchače, se kterými se tahle úvodní aplikace hodnot musí
// sladit (viz applyInitialSettings() na konci souboru).

var SETTINGS_FIELDS = [
  { id: 'degree-slider', kind: 'number' },
  { id: 'degree-evolves-checkbox', kind: 'checkbox' },
  { id: 'degree-mutation-rate-slider', kind: 'number' },
  { id: 'population-size-slider', kind: 'number' },
  { id: 'fitness-type-select', kind: 'text' },
  { id: 'fitness-tolerance-slider', kind: 'number' },
  { id: 'genome-transform-select', kind: 'text' },
  { id: 'genome-numeric-select', kind: 'text' },
  { id: 'genome-fixed-bits-slider', kind: 'number' },
  { id: 'selection-method-select', kind: 'text' },
  { id: 'tournament-size-slider', kind: 'number' },
  { id: 'crossover-rate-slider', kind: 'number' },
  { id: 'crossover-type-select', kind: 'text' },
  { id: 'crossover-points-slider', kind: 'number' },
  { id: 'mutation-type-select', kind: 'text' },
  { id: 'mutation-rate-slider', kind: 'number' },
  { id: 'mutation-sigma-slider', kind: 'number' },
  { id: 'replacement-mode-select', kind: 'text' },
  { id: 'replacement-percent-slider', kind: 'number' },
  { id: 'elite-count-slider', kind: 'number' },
  { id: 'speed-slider', kind: 'number' },
  { id: 'seed-input', kind: 'number' },
  { id: 'history-toggle-checkbox', kind: 'checkbox' }
];

// Jediné místo v kódu, které definuje výchozí hodnotu každého ovládacího
// prvku (spec 13.5) — odpovídá 1:1 createDefaultGaParams() v js/ga.js
// (degree 1 = přímka, viz spec bod 1; elitismus 0 + náhrada "celá generace"
// = sdílená konvence EvoMice 13.9, nejagresivnější nastavení jako výchozí
// demonstrační bod).
var DEFAULT_SETTINGS = {
  'degree-slider': 1,
  'degree-evolves-checkbox': false,
  'degree-mutation-rate-slider': 0.1,
  'population-size-slider': 60,
  'fitness-type-select': 'sse',
  'fitness-tolerance-slider': 1,
  'genome-transform-select': 'direct',
  'genome-numeric-select': 'float',
  'genome-fixed-bits-slider': 8,
  'selection-method-select': 'roulette',
  'tournament-size-slider': 3,
  'crossover-rate-slider': 0.8,
  'crossover-type-select': 'one-point',
  'crossover-points-slider': 3,
  'mutation-type-select': 'bit-flip',
  'mutation-rate-slider': 0.02,
  'mutation-sigma-slider': 0.3,
  'replacement-mode-select': 'full',
  'replacement-percent-slider': 50,
  'elite-count-slider': 0,
  'speed-slider': 2,
  'seed-input': 42,
  'history-toggle-checkbox': false
};

function applySettingsToUI(settings) {
  var i = 0;
  while (i < SETTINGS_FIELDS.length) {
    var field = SETTINGS_FIELDS[i];
    var value = settings[field.id];
    if (value !== undefined) {
      var element = document.getElementById(field.id);
      if (field.kind === 'checkbox') {
        element.checked = value;
      } else {
        element.value = value;
      }
    }
    i = i + 1;
  }
  refreshSliderDisplays(); // main.js — hodnoty sliderů jsme změnili napřímo, bez 'input' eventu
  updatePopulationSizeDependentControls(); // main.js
  updateConditionalControlsVisibility(); // main.js — selecty jsme taky změnili bez 'change' eventu
}

document.getElementById('reset-defaults-btn').addEventListener('click', function () {
  applySettingsToUI(DEFAULT_SETTINGS);
  stopRunning();
  resetEverything();
});

// --- Úvodní aplikace výchozích hodnot ---------------------------------------
//
// main.js už při vlastní inicializaci provedl výchozí resetEverything(), ale
// s hodnotami rovnou z HTML atributů (value) — tady je přepíšeme hodnotami
// z DEFAULT_SETTINGS (jedno místo pravdy, viz výš) a rovnou znovu resetujeme,
// ať i počáteční body/populace odpovídají přesně tomu, co formulář ukazuje.
function applyInitialSettings() {
  applySettingsToUI(DEFAULT_SETTINGS);
  resetEverything();
}

applyInitialSettings();
