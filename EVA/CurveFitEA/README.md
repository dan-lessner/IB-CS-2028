# CurveFitEA — evoluční prokládání bodů křivkou

Didaktická demonstrace metody nejmenších čtverců: místo výpočtu uzavřeným vzorcem se koeficienty
polynomu hledají **zkusmo, evolučním algoritmem**. Celá populace kandidátních křivek se vykresluje
současně nad sadou bodů, barevná sytost podle fitness — cíl je vidět, jak se "svazek" řešení v
čase sbíhá (nebo nesbíhá) k dobrému prokladu.

Sourozenecký projekt [EvoMice](../EvoMice/) (stejná architektura, stejné konvence — statická
HTML/JS stránka, i18n, responzivní layout).

## Jak spustit

Statická stránka, žádný build krok. Otevřít `index.html` přímo v prohlížeči, nebo servírovat přes:

```
python3 -m http.server 8000
```

a otevřít `http://localhost:8000/`.

## Co stránka umí

- **Body**: náhodně vygenerované ze skrytého referenčního modelu (evoluce ho nikdy nevidí, jen
  výsledné body) + volitelná ruční úprava myší — klik do prázdna přidá bod, klik na bod ho smaže,
  tažení bodu ho přesune. Souřadnice bodů jsou vždy přirozená čísla (celá, nezáporná).
- **Evoluce**: klasický generační genetický algoritmus — selekce (ruletová/turnajová), křížení
  (bitové: jednobodové/vícebodové/uniformní, nebo doménové: střídání koeficientů/bod mezi rodiči),
  mutace (bit-flip, nebo doménový gaussovský posun), elitismus a náhrada generace nastavitelné
  nezávisle na sobě.
- **Reprezentace genomu**: dvě nezávislé osy nastavení pro bitové operátory — transformace
  koeficientů (přímá vs. transformovaná/zužující se rozsah podle řádu) a číselná reprezentace
  (celá čísla / pevná řádová čárka s nastavitelným počtem bitů / float). Umožňuje demonstrovat, že
  evoluce může selhat čistě kvůli nevhodně zvolenému kódování, ne kvůli špatné strategii.
- **Stupeň polynomu**: buď pevně zvolený (1 = přímka), nebo součást genomu — evoluce si ho sama
  mění mutací/křížením v rámci nastaveného stropu, což umožňuje pozorovat over/underfitting.
- **Fitness**: součet čtverců odchylek (SSE, výchozí), průměrná absolutní odchylka (MAE),
  maximální odchylka, nebo počet trefených bodů v rámci tolerance (záměrně "objevná" metrika bez
  gradientu za hranicí tolerance — vyzkoušej a uvidíš proč to není tak dobrý nápad, jak vypadá).
- **Historie nejlepších jedinců**: volitelná blednoucí stopa nejlepšího jedince z každé předchozí
  generace, jinou barvou než aktuální populace.
- **Vizualizace odchylek**: najetí myší (nebo klik pro "přichycení") na křivku zobrazí čtverce
  jednotlivých odchylek bod↔křivka přímo na ploše, plus jejich součet.
- **i18n**: čeština/angličtina, přepínač v hlavičce.
- **Responzivní layout**: plocha se přizpůsobuje velikosti okna (landscape i portrait), zoom se
  scrollbary a panning tažením pravým tlačítkem myši, fullscreen režim.

## Struktura kódu

- `js/rng.js` — seedovatelný generátor náhodných čísel (mulberry32).
- `js/model.js` — doména, vyhodnocení polynomu, kódování koeficientů do genomu (bitová varianta,
  spec 5), fitness metriky, generování počáteční sady bodů.
- `js/ga.js` — evoluční jádro: selekce, křížení, mutace, náhrada generace, stupeň jako genom.
- `js/render.js` — vykreslování na canvas (osy, populace křivek, historie, body, čtverce
  odchylek), zoom.
- `js/input.js` — převod pozice myši na souřadnice/hit-testing bodů a křivek.
- `js/main.js` — propojení UI se stavem evoluce, hlavní smyčka, responzivní velikost canvasu.
- `js/defaults.js` — centralizované výchozí hodnoty všech ovládacích prvků + reset.
- `js/i18n.js`, `js/i18n/{cs,en}.js` — internacionalizace.

Každý JS modul (mimo `main.js`/`defaults.js`/`input.js`) obsahuje na konci vlastní self-testy
(`console.assert`), které se spustí automaticky při načtení stránky — otevři konzoli prohlížeče a
zkontroluj, že nejsou žádné "Assertion failed" zprávy.

## Vývojová dokumentace

Viz [PROGRESS.md](PROGRESS.md) — architektonická rozhodnutí u nejednoznačných míst specifikace a
stav jednotlivých fází vývoje.
