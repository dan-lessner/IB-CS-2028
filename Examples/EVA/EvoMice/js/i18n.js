// EvoMice — internacionalizace (i18n): překlad rozhraní beze změny zdrojového kódu.
//
// Princip: každý text v UI je klíč (např. "start_btn"), ne natvrdo napsaný
// řetězec. Slovníky (js/i18n/cs.js, js/i18n/en.js) mapují klíč -> text v
// daném jazyce. Tenhle soubor jen vybírá aktivní slovník a texty aplikuje:
//   - t(key, params)      — přeloží klíč pro JS-generovaný text (stats
//                           řádek, stavový řádek, text tlačítka...)
//   - applyTranslations() — projde DOM prvky s atributem data-i18n a
//                           nastaví jim textContent podle aktivního slovníku
// Přidání nového jazyka znamená přidat nový soubor slovníku (podle vzoru
// js/i18n/cs.js) a řádek do I18N_DICTIONARIES níže — nikde jinde v kódu se
// nic nemění.

var LANGUAGE_STORAGE_KEY = 'evomice-language';
var DEFAULT_LANGUAGE = 'cs';

var I18N_DICTIONARIES = {
  cs: I18N_CS,
  en: I18N_EN
};

var currentLanguage = DEFAULT_LANGUAGE;

// Vrátí aktivní slovník (klíč -> text). Padá zpátky na výchozí jazyk, kdyby
// currentLanguage obsahoval jazyk bez vlastního slovníku.
function getActiveDictionary() {
  var dictionary = I18N_DICTIONARIES[currentLanguage];
  if (dictionary === undefined) {
    return I18N_DICTIONARIES[DEFAULT_LANGUAGE];
  }
  return dictionary;
}

// Přeloží klíč do aktivního jazyka. `params` (nepovinné) je objekt náhrad za
// placeholdery tvaru "{jmeno}" v textu, např. t('stats_line', { gen: 5 }).
function t(key, params) {
  var dictionary = getActiveDictionary();
  var text = dictionary[key];

  if (text === undefined) {
    // Chybějící klíč nesmí zůstat neviditelný chybou jen v konzoli — rovnou
    // ho ukážeme v UI, ať se překlep v klíči najde hned při vývoji.
    return '[[' + key + ']]';
  }

  if (params !== undefined) {
    for (var paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        var placeholder = '{' + paramName + '}';
        text = text.split(placeholder).join(String(params[paramName]));
      }
    }
  }

  return text;
}

// Projde všechny prvky s atributem data-i18n a nastaví jim textContent podle
// aktivního slovníku. Volá se při startu a po každé změně jazyka.
function applyTranslations() {
  var elements = document.querySelectorAll('[data-i18n]');
  var i = 0;
  while (i < elements.length) {
    var element = elements[i];
    var key = element.getAttribute('data-i18n');
    element.textContent = t(key);
    i = i + 1;
  }

  applyTooltips();
}

// Projde tooltip ikonky (atribut data-i18n-tooltip) a přeloží jejich obsah.
// Text se ukládá do data-tooltip (odtud ho čte CSS bublina, viz style.css,
// `.help-icon::after { content: attr(data-tooltip); }`) a zároveň do
// aria-label, ať je dostupný i čtečkám obrazovky.
function applyTooltips() {
  var elements = document.querySelectorAll('[data-i18n-tooltip]');
  var i = 0;
  while (i < elements.length) {
    var element = elements[i];
    var key = element.getAttribute('data-i18n-tooltip');
    var text = t(key);
    element.setAttribute('data-tooltip', text);
    element.setAttribute('aria-label', text);
    i = i + 1;
  }
}

// Přepne aktivní jazyk, uloží volbu (přežije reload stránky) a přeloží DOM.
//
// Texty mimo data-i18n — generované za běhu v main.js (stavový řádek,
// text tlačítka start/pauza, statistiky) — si po zavolání téhle funkce
// obnoví main.js samo přes volitelný hook onLanguageChanged(), pokud je
// v danou chvíli definovaný (main.js se načítá až po tomhle souboru).
function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  applyTranslations();
  if (typeof onLanguageChanged === 'function') {
    onLanguageChanged();
  }
}

function getCurrentLanguage() {
  return currentLanguage;
}

// --- Přepínač jazyka v UI ---------------------------------------------------

function updateLanguageButtonsPressedState() {
  var csButton = document.getElementById('lang-cs-btn');
  var enButton = document.getElementById('lang-en-btn');
  csButton.setAttribute('aria-pressed', String(currentLanguage === 'cs'));
  enButton.setAttribute('aria-pressed', String(currentLanguage === 'en'));
}

function initLanguageSwitcher() {
  var csButton = document.getElementById('lang-cs-btn');
  var enButton = document.getElementById('lang-en-btn');

  csButton.addEventListener('click', function () {
    setLanguage('cs');
    updateLanguageButtonsPressedState();
  });
  enButton.addEventListener('click', function () {
    setLanguage('en');
    updateLanguageButtonsPressedState();
  });
}

// --- Úvodní inicializace ----------------------------------------------------
//
// Jazyk se určí ze zapamatované volby (localStorage); pokud tam žádná není,
// zůstává výchozí čeština. Tenhle soubor se v index.html načítá dřív než
// main.js, ale po HTML těle (script tagy jsou na konci <body>), takže DOM
// prvky, které tu procházíme, už existují.
function initI18n() {
  var storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage !== null && I18N_DICTIONARIES[storedLanguage] !== undefined) {
    currentLanguage = storedLanguage;
  }
  applyTranslations();
  initLanguageSwitcher();
  updateLanguageButtonsPressedState();
}

initI18n();
