// EvoMice — uložení/načtení nastavení (a volitelně stavu plochy) do cookie
// nebo do URL (spec 12.5).
//
// Rozhraní ven je úzké a symetrické: buildSaveData() sesbírá aktuální
// nastavení (+ volitelně stav plochy) do jednoho prostého objektu,
// applySaveData() ho zase vrátí zpátky do UI a spustí čerstvý reset
// simulace. Serializace do textu (JSON) je jen "obálka" navrch — stejná
// pro cookie i pro URL parametr, ať se nepíše dvakrát.
//
// Soubor se načítá jako poslední <script> v index.html (po main.js) —
// potřebuje jeho globální stav (resetSimulation, population, foodList,
// gridConfig, foodMode...) a taky to, že proběhl výchozí resetSimulation()
// z main.js dřív, než ho tenhle soubor případně přepíše daty z URL.

var SAVE_LOAD_COOKIE_NAME = 'evomice_settings';
var SAVE_LOAD_URL_PARAM = 'evomice';
var SAVE_LOAD_CONSENT_STORAGE_KEY = 'evomice_cookie_consent_shown';

// --- Sběr / aplikace nastavení z UI -----------------------------------------
//
// Ukládají se jen ovládací prvky, které mění chování simulace — ne jazyk
// (vlastní localStorage, viz i18n.js) ani zoom (čistě zobrazovací, spec
// 12.3, nemá smysl "sdílet" spolu s nastavením běhu).
var SAVE_LOAD_FIELDS = [
  { id: 'population-size-slider', kind: 'number' },
  { id: 'grid-size-slider', kind: 'number' },
  { id: 'food-count-slider', kind: 'number' },
  { id: 'food-capacity-slider', kind: 'number' },
  { id: 'food-depletes-checkbox', kind: 'checkbox' },
  { id: 'food-replenishes-checkbox', kind: 'checkbox' },
  { id: 'fitness-type-select', kind: 'text' },
  { id: 'selection-method-select', kind: 'text' },
  { id: 'tournament-size-slider', kind: 'number' },
  { id: 'crossover-rate-slider', kind: 'number' },
  { id: 'crossover-type-select', kind: 'text' },
  { id: 'crossover-points-slider', kind: 'number' },
  { id: 'mutation-type-select', kind: 'text' },
  { id: 'mutation-rate-slider', kind: 'number' },
  { id: 'mutation-jump-radius-slider', kind: 'number' },
  { id: 'elite-count-slider', kind: 'number' },
  { id: 'replacement-mode-select', kind: 'text' },
  { id: 'replacement-percent-slider', kind: 'number' },
  { id: 'speed-slider', kind: 'number' },
  { id: 'seed-input', kind: 'number' }
];

// --- Výchozí hodnoty nastavení (spec 13.5) -----------------------------
//
// Jediné místo v kódu, které definuje výchozí hodnotu každého ovládacího
// prvku (klíč = id prvku, stejně jako SAVE_LOAD_FIELDS výše, + 'food-mode'
// pro dvojici radio tlačítek). Slouží dvakrát:
//   - tlačítko "reset na výchozí" (viz posluchač níže) ho aplikuje přímo,
//   - applyDefaultSettingsOnStartup() ho aplikuje jednou při načtení
//     stránky, ať HTML atributy value/checked nejsou druhé, nezávislé
//     místo pravdy — i kdyby se časem rozešly, tenhle objekt vždycky
//     "vyhraje" a přepíše je.
// Hodnoty odpovídají spec 13.1 (výchozí režim krmení v UI "ruční
// kreslení") a spec 13.9 (elitismus 0, náhrada generace celá najednou —
// nejagresivnější nastavení, dobrý výchozí bod pro demonstraci, že bez
// elitismu se i dobrá řešení dají mezi generacemi ztratit).
var DEFAULT_SETTINGS = {
  'population-size-slider': 80,
  'grid-size-slider': 48,
  'food-count-slider': 20,
  'food-capacity-slider': 20,
  'food-depletes-checkbox': false,
  'food-replenishes-checkbox': false,
  'food-mode': 'manual',
  'fitness-type-select': 'binary',
  'selection-method-select': 'roulette',
  'tournament-size-slider': 3,
  'crossover-rate-slider': 0.8,
  'crossover-type-select': 'xy-split',
  'crossover-points-slider': 3,
  'mutation-type-select': 'bit-flip',
  'mutation-rate-slider': 0.02,
  'mutation-jump-radius-slider': 3,
  'elite-count-slider': 0,
  'replacement-mode-select': 'full',
  'replacement-percent-slider': 50,
  'speed-slider': 2,
  'seed-input': 42
};

function collectSettingsFromUI() {
  var settings = {};
  var i = 0;
  while (i < SAVE_LOAD_FIELDS.length) {
    var field = SAVE_LOAD_FIELDS[i];
    var el = document.getElementById(field.id);
    if (field.kind === 'checkbox') {
      settings[field.id] = el.checked;
    } else if (field.kind === 'number') {
      settings[field.id] = Number(el.value);
    } else {
      settings[field.id] = el.value;
    }
    i = i + 1;
  }
  // food-mode je dvojice radio tlačítek (spec 2), ne jeden element —
  // ukládá se ze stavové proměnné main.js, stejně jako ji main.js samo čte.
  settings['food-mode'] = foodMode;
  return settings;
}

// Nastaví ovládací prvky podle uložených dat. Chybějící klíče (starší
// uložený odkaz z verze, kde přibyl nový ovládací prvek) se přeskočí —
// zůstane výchozí hodnota z HTML, žádná chyba.
function applySettingsToUI(settings) {
  var i = 0;
  while (i < SAVE_LOAD_FIELDS.length) {
    var field = SAVE_LOAD_FIELDS[i];
    var savedValue = settings[field.id];
    if (savedValue !== undefined) {
      var el = document.getElementById(field.id);
      if (field.kind === 'checkbox') {
        el.checked = savedValue;
      } else {
        el.value = savedValue;
      }
    }
    i = i + 1;
  }
  refreshSliderDisplays(); // main.js — hodnoty sliderů jsme změnili napřímo, bez 'input' eventu
  updatePopulationSizeDependentControls(); // main.js — spec 13.4, taky bez 'input' eventu
  updateConditionalControlsVisibility(); // main.js — spec 13.8, selecty jsme taky změnili bez 'change' eventu

  if (settings['food-mode'] === 'manual') {
    document.getElementById('food-mode-manual').checked = true;
    foodMode = 'manual';
  } else if (settings['food-mode'] === 'random') {
    document.getElementById('food-mode-random').checked = true;
    foodMode = 'random';
  }
}

// --- Sběr / aplikace stavu plochy (bakterie + krmení) — volitelná součást --

function collectBoardState() {
  var bacteria = [];
  var i = 0;
  while (i < population.length) {
    bacteria.push({ x: population[i].x, y: population[i].y });
    i = i + 1;
  }

  var food = [];
  var j = 0;
  while (j < foodList.length) {
    food.push({ x: foodList[j].x, y: foodList[j].y, amount: foodList[j].amount });
    j = j + 1;
  }

  return { bacteria: bacteria, food: food };
}

function applyBoardState(boardState) {
  var newPopulation = [];
  var i = 0;
  while (i < boardState.bacteria.length) {
    var bacteriumCoord = boardState.bacteria[i];
    newPopulation.push(createBacterium(bacteriumCoord.x, bacteriumCoord.y, gridConfig));
    i = i + 1;
  }
  population = newPopulation;

  var newFood = [];
  var j = 0;
  while (j < boardState.food.length) {
    var foodCell = boardState.food[j];
    newFood.push(createFood(foodCell.x, foodCell.y, foodCell.amount)); // 3. arg = počáteční amount
    j = j + 1;
  }
  foodList = newFood;
}

// --- Sestavení a aplikace kompletních uložených dat -------------------------

function buildSaveData(includeBoard) {
  var data = { settings: collectSettingsFromUI() };
  if (includeBoard) {
    data.board = collectBoardState();
  }
  return data;
}

// `forceRandomFoodSeed` (nepovinné) se předává rovnou do resetSimulation()
// — používá ho jen applyInitialSettings() níže pro úplně první aplikaci
// DEFAULT_SETTINGS (spec 13.1: počáteční krmení je vždy náhodně rozhozené,
// i když výchozí režim v UI je "ruční kreslení"). Běžné uložené/sdílené
// odkazy a cookie tenhle argument nepředávají — jejich uložený stav krmení
// (včetně prázdné plochy v ručním režimu) se respektuje přesně tak, jak byl.
function applySaveData(data, forceRandomFoodSeed) {
  applySettingsToUI(data.settings);
  stopRunning();
  resetSimulation(forceRandomFoodSeed); // stejný krok jako tlačítko "Nastavit seed a resetovat" — čte teď už nové hodnoty z UI

  if (data.board !== undefined) {
    applyBoardState(data.board);
    redraw();
  }
}

// JSON.parse může na ručně upraveném/poškozeném odkazu nebo cookie spadnout
// — jediné místo v projektu, kde je try/catch namístě (chráníme jen tenhle
// jeden řádek parsování vstupu zvenčí, ne jako obecný řídicí tok).
function parseSaveDataJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    return null;
  }
}

// --- Cookie: čtení/zápis/mazání ---------------------------------------------

function setCookieValue(name, value, days) {
  var expiresDate = new Date();
  expiresDate.setTime(expiresDate.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + encodeURIComponent(value) +
    '; expires=' + expiresDate.toUTCString() + '; path=/; SameSite=Lax';
}

function getCookieValue(name) {
  var cookiePairs = document.cookie.split('; ');
  var i = 0;
  while (i < cookiePairs.length) {
    var separatorIndex = cookiePairs[i].indexOf('=');
    var cookieName = cookiePairs[i].substring(0, separatorIndex);
    if (cookieName === name) {
      return decodeURIComponent(cookiePairs[i].substring(separatorIndex + 1));
    }
    i = i + 1;
  }
  return null;
}

function deleteCookieValue(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// --- URL: sestavení odkazu ke sdílení / čtení parametrů při startu ---------

function buildShareUrl(data) {
  var url = new URL(window.location.href);
  url.search = ''; // nezachovávat případné staré/cizí parametry
  url.searchParams.set(SAVE_LOAD_URL_PARAM, JSON.stringify(data));
  return url.toString();
}

function readSaveDataFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var rawText = params.get(SAVE_LOAD_URL_PARAM);
  if (rawText === null) {
    return null;
  }
  return parseSaveDataJson(rawText);
}

// --- Stavový řádek sekce (spec 12.5 UI zpětná vazba) ------------------------

var lastSaveLoadStatusKey = null; // null = zatím žádná zpráva k zobrazení

function setSaveLoadStatus(key) {
  lastSaveLoadStatusKey = key;
  var el = document.getElementById('saveload-status-line');
  if (el !== null) {
    el.textContent = t(key);
  }
}

// Volitelný hook volaný z main.js (onLanguageChanged) po přepnutí jazyka.
function onSaveLoadLanguageChanged() {
  if (lastSaveLoadStatusKey !== null) {
    setSaveLoadStatus(lastSaveLoadStatusKey);
  }
}

// --- Souhlas s cookie (spec 12.5: musí být explicitní, ne skrytě) ----------
//
// Potvrzovací dialog se ukáže jen před úplně prvním uložením do cookie
// (zapamatováno v localStorage — to samo cookie není a souhlas nevyžaduje).
// Když uživatel zruší, souhlas se nezapamatuje a dialog se zeptá znovu při
// příštím pokusu o uložení.
function ensureCookieConsent() {
  var alreadyConsented = localStorage.getItem(SAVE_LOAD_CONSENT_STORAGE_KEY) === 'true';
  if (alreadyConsented) {
    return true;
  }
  var userConsented = window.confirm(t('cookie_consent_message'));
  if (userConsented) {
    localStorage.setItem(SAVE_LOAD_CONSENT_STORAGE_KEY, 'true');
  }
  return userConsented;
}

// --- Napojení tlačítek --------------------------------------------------

document.getElementById('save-cookie-btn').addEventListener('click', function () {
  if (!ensureCookieConsent()) {
    setSaveLoadStatus('saveload_status_cookie_declined');
    return;
  }
  var includeBoard = document.getElementById('saveload-include-board-checkbox').checked;
  var data = buildSaveData(includeBoard);
  setCookieValue(SAVE_LOAD_COOKIE_NAME, JSON.stringify(data), 365);
  setSaveLoadStatus('saveload_status_cookie_saved');
});

document.getElementById('load-cookie-btn').addEventListener('click', function () {
  var rawText = getCookieValue(SAVE_LOAD_COOKIE_NAME);
  if (rawText === null || rawText === '') { // '' i po smazané/prošlé cookie v některých prohlížečích
    setSaveLoadStatus('saveload_status_cookie_missing');
    return;
  }
  var data = parseSaveDataJson(rawText);
  if (data === null) {
    setSaveLoadStatus('saveload_status_cookie_corrupt');
    return;
  }
  applySaveData(data);
  setSaveLoadStatus('saveload_status_cookie_loaded');
});

document.getElementById('clear-cookie-btn').addEventListener('click', function () {
  deleteCookieValue(SAVE_LOAD_COOKIE_NAME);
  setSaveLoadStatus('saveload_status_cookie_cleared');
});

document.getElementById('reset-defaults-btn').addEventListener('click', function () {
  applySaveData({ settings: DEFAULT_SETTINGS }); // bez stavu plochy — ten se resetSimulation() uvnitř postará
  setSaveLoadStatus('saveload_status_defaults_applied');
});

document.getElementById('save-link-btn').addEventListener('click', function () {
  var includeBoard = document.getElementById('saveload-include-board-checkbox').checked;
  var data = buildSaveData(includeBoard);
  var shareUrl = buildShareUrl(data);

  var output = document.getElementById('save-link-output');
  output.value = shareUrl;
  output.select(); // ať jde rovnou Ctrl+C zkopírovat bez ručního označování

  setSaveLoadStatus('saveload_status_link_ready');
});

// --- Úvodní aplikace výchozích hodnot + načtení z URL -----------------------
//
// main.js už při vlastní inicializaci provedl výchozí resetSimulation(), ale
// s hodnotami rovnou z HTML atributů (value/checked) — tady je přepíšeme
// hodnotami z DEFAULT_SETTINGS (spec 13.5: jedno místo pravdy, viz výš) a
// rovnou znovu resetujeme, ať i počáteční populace/krmení odpovídá přesně
// tomu, co formulář ukazuje. Pokud URL obsahuje uložená data, aplikujeme je
// navrch (viz komentář u <script> tagu v index.html pro pořadí načítání) —
// ta mají přednost před výchozími hodnotami.
function applyInitialSettings() {
  applySaveData({ settings: DEFAULT_SETTINGS }, true); // spec 13.1: viz komentář u applySaveData

  var urlData = readSaveDataFromUrl();
  if (urlData !== null) {
    applySaveData(urlData);
    setSaveLoadStatus('saveload_status_link_loaded');
  }
}

applyInitialSettings();
