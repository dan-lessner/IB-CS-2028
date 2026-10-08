# EvoMice — dokumentace a plán

Specifikace: viz Obsidian `_Agentic/EvoMice/EvoMice - specifikace.md` (zdroj pravdy pro zadání,
v1-v13 historie zadání). Tenhle soubor je živá dokumentace (ne log) — udržuj ho aktuální,
historii dokončených kroků hledej v git historii (`git log -- EVA/EvoMice`), ne tady.

## Jak spustit

Statická stránka, žádný build krok. Otevřít `index.html` přímo v prohlížeči.

## Stav

- v1-v4 (viz `personal-playground/EvoMice` git historie, kód je stejný, jen bez dev-dokumentace
  přenesen sem 2026-09-09) — hotovo.
- v5 (spec sekce 13) — hotovo (2026-09-09), všech 10 kroků commitnuto a vizuálně ověřeno.
- **v6 (spec sekce 14) — hotovo (2026-09-10), oba kroky (14.1, 14.2) commitnuty a vizuálně
  ověřeny, viz "Poznámky za běhu" níže.**

## Plán v6 (spec sekce 14) — bakterie + responzivní layout

- [x] 14.1 — přejmenování metafory myši → bakterie na agaru (i18n, UI, README, přiměřeně kód)
- [x] 14.2 — responzivní layout: plocha = co největší čtverec v landscape, dynamická velikost
      buněk, dynamický strop posuvníku velikosti plochy (min. 1px/pozice), ovládání+graf mezi
      plochou a nastavením, zoom se scrollbary + panning
      **POVINNĚ ověřit Chromium screenshoty na víc velikostí okna** (široký landscape, úzký
      landscape/telefon na šířku, portrait telefon) — tohle je opakovaně nejrizikovější místo.

Malé samostatně commitovatelné kroky, commit+push po každém.

## Vizuální ověřování (nové od v5)

Na VM je od 2026-09-09 nainstalované skutečné headless Chromium — **použij ho na reálné
screenshoty před commitem cokoliv layoutového**, ne jen Lightpanda JS-bez-pádu kontrolu (ta
neumí layout vůbec, viz starší poznámky v historii tohohle souboru v personal-playground repu).

```
cd EVA/EvoMice && python3 -m http.server 8531 --bind 127.0.0.1 &
chromium --headless --disable-gpu --no-sandbox --window-size=1600,1000 \
  --screenshot=/home/agent/evomice_check.png "http://127.0.0.1:8531/index.html"
```

Screenshot cesta MUSÍ být v `$HOME`, ne v repu ani ve scratchpadu (snap confinement) — smaž ho
po prohlédnutí, necommituj.

## Plán v5 (spec sekce 13)

- [x] 13.1 — výchozí režim krmení v UI = "ruční kreslení" (počáteční rozhození zůstává)
- [x] 13.2 — přesunout blok "Běh simulace" k ploše (k zoomu/fullscreen)
- [x] 13.3 — zrušit patičku
- [x] 13.4 — populace až 1, deaktivovat irelevantní prvky (křížení, turnaj)
- [x] 13.5 — centralizovat výchozí hodnoty (u save/load kódu) + tlačítko reset na výchozí
- [x] 13.6 — fullscreen: graf využije celou výšku, auto-hide ovládací panel při pohybu myší
      (ověřeno screenshotem, viz "Poznámky za běhu" — funguje potřetí napoprvé)
- [x] 13.7 — velikost plochy až 512
- [x] 13.8 — podmíněné zobrazení parametrů (velikost turnaje, počet bodů řezu, ...)
- [x] 13.9 — elitismus pod náhradu generace, default elitismus=0, náhrada=celá generace
- [x] 13.10 — seed nahoru k resetu, zrušit vlastní panel

Malé samostatně commitovatelné kroky, commit+push po každém. i18n (žádný natvrdo zadrátovaný
text) a didaktický kód platí pořád.

## Poznámky za běhu

**14.2 — přestavba layoutu na "co největší čtverec" + zoom/panning.**

Zásadní strukturální změna (index.html i style.css): `#canvas-area` je teď
JEN samotná plocha (canvas), žádné ovládání ani graf uvnitř. Nový
`#simulation-wrapper` drží `#canvas-area` + nový `#middle-panel`
(ovládání běhu, zoom, fullscreen, kurzor, graf fitness) pohromadě — i jako
společný požádaný element Fullscreen API (dřív to bylo jen `#canvas-area`
s plovoucí lištou přes vrch a auto-hide, spec 13.6). Auto-hide toolbaru
(13.6) byl **záměrně odstraněný** — dřív řešil to, že ovládání overlayovalo
plochu; teď ovládání žije natrvalo ve vlastním sloupci/pruhu vedle/pod
plochou, takže není co schovávat, a odstranění zjednodušilo kód beze ztráty
funkčnosti (žádná regrese, jen jiné řešení stejného problému).

Layout: `main` i `#simulation-wrapper` jsou landscape dvousloupcové
(`grid`, `min-height:0; overflow:hidden`, nezávislý scroll `#controls` a
`#middle-panel`), portrait jednosloupcové s přirozeným scrollem celé
stránky (`overflow: visible`, `#canvas-area { aspect-ratio: 1 }` — čtverec
přesně na míru dostupné šířky, žádná zbytečná rezerva). `#canvas-area` má
vlastní `overflow: auto` — zoom (CSS `zoom` na `#canvas-container`, ne na
celý panel jako dřív) roztáhne obsah nad box, což samo vyvolá posuvníky
(ověřeno debug skriptem: scrollWidth 1682 vs. clientWidth 915 při zoomu
3×). Panning je na pravé tlačítko myši (`event.button === 2`, `contextmenu`
potlačen) — levé zůstává pro ruční kreslení krmení (`input.js` teď navíc
explicitně kontroluje `event.button === 0`, aby se ty dvě interakce
nerušily). Ověřeno simulovaným mousedown/mousemove/mouseup: scroll pozice
se po tažení skutečně posunula (0,0 → 100,100).

Dynamický strop `grid-size-slider`: `computeMaxGridSize()` v `main.js`
spočítá z aktuální velikosti `#canvas-area` (nezávislé na obsahu canvasu,
je to čistě CSS/grid box), kolik buněk se vejde při `MIN_CELL_PIXEL_SIZE=1`
(sníženo z 2, viz `render.js`) — `updateGridSizeCap()` nastaví `slider.max`
a srovná hodnotu dolů, pokud ji přesahuje. Ověřeno: 1600×1000 → strop 787
(hodnota 48 beze změny), 420×300 (extrémně malé okno) → strop i hodnota
srovnané na absolutní minimum 8.

**Cesta k funkčnímu layoutu nebyla přímá — dvě reálné regrese nalezené a
opravené vlastním screenshotem, ne až uživatelem:**
1. Flexbox "čipy" se sliderem (seed/rychlost/zoom) v úzkém 280px
   `#middle-panel` přetékaly vodorovně (dlouhý label text/tlačítko se
   nezalomil, `min-width: auto` na flex itemu s `flex-basis` z
   max-content) — řešeno návratem k osvědčenému blokovému vzorci
   (`display: block`, `input[type=range] { width: 100% }`), stejnému, jaký
   už funguje v `#controls`.
2. Graf fitness (canvas s HTML atributem `width="320"`) vynucoval
   min-content šířku flex itemu přes dostupných 280px — řešeno
   `#middle-panel > * { min-width: 0 }`.
Obojí bylo vidět přímo na screenshotu (vodorovný scrollbar pod
`#middle-panel`) a přesně lokalizováno přidáním dočasného debug elementu
(`scrollWidth`/`clientWidth` na jednotlivých dětech), ne odhadem.

**Screenshoty (`http.server` + `chromium --headless`), co na nich je vidět:**
- **1600×1000 (široký landscape):** čtverec plochy ~930×930px (největší
  možný z dostupné výšky), `#middle-panel` (280px) vpravo od něj s
  ovládáním běhu a prázdným grafem fitness (generace 0), `#controls`
  (300px, vlastní scrollbar) úplně vpravo. Žádný vodorovný scroll navíc.
- **900×420 (úzký landscape / telefon na šířku):** stejné tři sloupce,
  čtverec je tu šířkou omezený (dostupná šířka 900 mínus oba boční pruhy
  vychází ~230px) — menší, ale pořád validní "největší možný čtverec" za
  daných pevných šířek `#middle-panel`/`#controls`. Hlavička (nadpis +
  přepínač jazyka) se vizuálně těsní s ovládáním, ale nic se nepřekrývá.
- **420×900 (portrait telefon):** jeden sloupec, čtverec nahoře přes celou
  šířku (`aspect-ratio: 1`), pod ním `#middle-panel` (ovládání, kurzor,
  graf), dál dole `#controls` (nastavení) — celá stránka roluje přirozeně
  (jeden svislý scrollbar vpravo, ne tři nezávislé). Ověřeno i na extrémně
  vysokém 420×2400 (nereálný poměr stran, jen diagnostika) — žádná
  zbytečná prázdná mezera nad/pod čtvercem.
- **Fullscreen (simulováno `.is-fullscreen` třídou bez reálného gesta,
  stejná metoda jako 13.6):** landscape 1600×1000 → čtverec vyplňuje
  prakticky celou výšku okna, `#middle-panel` vpravo, `#controls` skrytý.
  Portrait 420×900 → čtverec nahoře přes šířku, ovládání pod ním, taky bez
  `#controls`.

**13.6 — jak se to ověřovalo bez skutečného Fullscreen API.** "Myš" v kódu měla dva různé významy —
jedinec populace (přejmenováno na "bakterie"/`bacterium`, viz i18n slovníky
a funkce/proměnné v `genome.js`/`ga.js`/`render.js`/`save-load.js`) a
počítačová myš jako vstupní zařízení (`mousemove`/`mouseup`/`mousedown`,
komentáře o "kurzoru myši" v `input.js` a `food_mode_manual_tooltip`) — ty
zůstaly beze změny, jde o jiný pojem. Žádné README pro EvoMice v repu
neexistuje (jen `PROGRESS.md`), není tedy co upravovat. Obecný pojem
"plocha" (velikost plochy, `#canvas-area`, `gridConfig`) zůstal jako
technický/UI název beze změny na "miska"/"agar" — je to napříč HTML/CSS/JS
příliš rozšířené na bezpečné přejmenování v tomhle kroku a spec vyžaduje
jen přejmenování jedince ("myš/myši" → "bakterie"), ne nutně názvu plochy.
Self-testy (`node` na `rng.js`+`genome.js`+`ga.js`) po přejmenování
proběhly beze změny v počtu ověření (2346 + 222), stránka byla ověřena
screenshotem bez JS chyb v konzoli/síti.

**13.6 — jak se to ověřovalo bez skutečného Fullscreen API.** Headless
Chromium odmítá `requestFullscreen()` bez opravdového uživatelského gesta
(promise se zamítne, `:fullscreen` se nikdy neuplatní) — proto celá
fullscreen logika teď nezávisí na CSS pseudo-třídě `:fullscreen` přímo, ale
na JS-toggled třídě `.is-fullscreen` na `#canvas-area` (viz
`isFullscreenActive()` v `main.js`, nastavuje/ruší ji `fullscreenchange`
listener). Díky tomu šlo layout ověřit i bez reálného gesta — dočasně (jen
pro test, ne v commitnutém kódu) přidán `<script>` kontrolovaný přes
`?debugFullscreen=1`, který třídu nastaví ručně + navíc nasimuluje, že
`#canvas-area` skutečně vyplňuje celý viewport (`position:fixed;inset:0`),
což jinak zajišťuje prohlížeč sám při reálném fullscreenu. Ověřeno
screenshoty (1600×1000):
- Toolbar (běh simulace, zoom, fullscreen tlačítko) je plovoucí
  poloprůhledná lišta přes horní okraj, plocha simulace pod ní vyplňuje
  prakticky celou výšku okna.
- Graf fitness vpravo (landscape orientace → info panel vedle plochy)
  vyplňuje celou výšku sloupce, ne malý ~90px pruh jako dřív — `canvas`
  atributy `width`/`height` se teď dopočítávají z reálné CSS velikosti
  (`updateFitnessChartCanvasSize()` v `main.js`).
- Auto-hide: toolbar zmizel (opacity 0) po ~2.5 s nečinnosti
  (`--virtual-time-budget=4000`), a při simulovaném `mousemove` na
  `#canvas-area` se okamžitě vrátil zpět.
- Mimo fullscreen (běžný screenshot bez debug parametru) beze změny oproti
  minulému kroku — žádná regrese.

Skutečné volání Fullscreen API (klik na tlačítko myší v opravdovém
prohlížeči) nebylo touhle cestou ověřeno, jen simulovaný CSS/JS stav — na
reálném uživatelském kliknutí by se ale měla spustit úplně stejná větev
kódu (`fullscreenchange` nastaví stejnou třídu `.is-fullscreen`), takže by
se mělo chovat stejně.
