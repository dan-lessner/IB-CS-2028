# CurveFitEA — dokumentace a plán

Specifikace: `_Agentic/EvoMice/CurveFitEA - specifikace.md` (zdroj pravdy pro zadání) v Obsidianu,
odkazuje se navíc na sdílené konvence z `_Agentic/EvoMice/EvoMice - specifikace.md` (sekce 6a
didaktický kód, 8.2 i18n, 13.5 centralizace defaultů, 13.8 podmíněné parametry, 14.2 responzivní
layout). Tenhle soubor je živá dokumentace (ne log) — udržuj ho aktuální, historii dokončených
kroků hledej v git historii (`git log -- EVA/CurveFitEA`), ne tady.

## Koncept (stručně, viz spec pro detaily)

Didaktická demonstrace metody nejmenších čtverců: místo výpočtu uzavřeným vzorcem hledáme
koeficienty polynomu (daného stupně) evolučním algoritmem. Genom jedince = koeficienty
polynomu. Fitness = SSE (součet čtverců odchylek) křivky od bodů. Populace kandidátních křivek
se vykresluje současně, sytost barvy podle fitness. Body na ploše lze myší přidávat/mazat/tahat;
klik/hover na křivku zobrazí čtverce odchylek + jejich součet.

## Jak spustit

Statická stránka, žádný build krok. Otevřít `index.html` přímo v prohlížeči, nebo servírovat přes
`python3 -m http.server`.

## Architektonická rozhodnutí (nejednoznačná místa spec)

- **Normalizace x pro polynom:** koeficienty se evolučně hledají pro polynom vyhodnocený v
  normalizované souřadnici `u = (x - xMid) / xHalfSpan ∈ [-1, 1]`, ne přímo v souřadnici `x`
  domény. Díky tomu nedochází k "výbuchu" vysokých mocnin (x^5 apod.) a všechny koeficienty
  mohou sdílet stejný rozsah/přesnost kódování bez ohledu na stupeň polynomu — jinak by vyšší
  koeficienty potřebovaly řádově menší rozsah než ten první, což by komplikovalo bitové kódování
  i UI. Studentům je to vysvětleno v tooltipu sekce polynomu.
- **Rozsah koeficientů (`coeffRange`):** dopočítá se při každém resetu z rozpětí generovaných
  bodů (`max(10, 3 × maxAbsY)`), použije se jako mez pro bitové kódování i pro počáteční
  náhodnou populaci u obou variant (bitová/doménová). Není to samostatný UI ovládací prvek —
  přidávalo by to složitost bez jasného didaktického přínosu.
- **Body vs. doména:** doména (`x ∈ [DOMAIN_X_MIN, DOMAIN_X_MAX]`, `y` dopočtené z dat) je vždy
  přesně to, co odpovídá hranicím plochy — klik kamkoli na plochu tedy vždy padne do domény,
  není potřeba řešit "bod mimo rozsah".
  Referenční skrytý model (stupeň, koeficienty, šum) je nezávislý na uživatelem zvoleném stupni
  fitovaného polynomu — je to záměrné (umožňuje podfitování i přefitování jako pozorovatelný jev).
- **Tlačítko "Nová náhodná sada bodů (reset)"** (analogie EvoMice "Nová náhodná populace")
  regeneruje **obojí** — nové body ze skrytého modelu i novou náhodnou populaci — podle aktuálního
  seedu. Změna stupně polynomu restartuje jen populaci (nová náhodná populace daného stupně),
  body zůstávají — uživatelova ruční úprava bodů se změnou stupně neztrácí.
- **Metrika fitness:** SSE je výchozí a hlavní (dle spec), MAE nabídnuta jako alternativa
  (select, spec bod 5 "volitelně"). Fitness pro účely selekce/řazení je vždy `1 / (1 + chyba)`
  (vyšší = lepší), zobrazená/optimalizovaná "chyba" je přímo SSE nebo MAE dle volby.
- **Bez fitness grafu a bez save/load (cookie/URL):** CurveFitEA spec je na rozdíl od EvoMice
  nezmiňuje — vynecháno kvůli udržení rozsahu; centralizované defaulty + reset ano (spec 5,
  sdílená 13.5), ukládání/sdílení odkazem ne.
- **Reprezentace genomu (spec 5) — konkrétní interpretace obou os:**
  - **5.1 Transformace:** "přímá" = každý koeficient sdílí stejný `coeffRange` bez ohledu na
    řád (dřívější/jediné dosavadní chování). "Transformovaná" = rozsah i-tého koeficientu se
    geometricky zužuje (`coeffRange / 3^i`, viz `coeffRangeForIndex` v model.js) — nižší řády
    (typicky větší co do velikosti po normalizaci x) dostanou stejný rozsah jako dřív, vyšší
    řády (typicky menší) dostanou užší, tedy JEMNĚJŠÍ rozsah při stejném počtu bitů. Nešlo o
    "kódovat surové a_i vs. normalizované u" (to je jiná, už dřív padlá otázka — normalizace x
    je vždy zapnutá, viz `evaluatePolynomial`/`normalizeX`) — spec 5.1 popisuje kódování
    KOEFICIENTŮ do bitů, ne vyhodnocení polynomu v x.
  - **5.2 Číselná reprezentace:** týká se JEN bitové (ne doménové) varianty — doménová vždy
    pracuje s plnou přesností JS float podle spec 4.2, žádné další kódování tam nedává smysl.
    "Celá čísla" = přesně tolik bitů, kolik stačí na celá čísla v daném rozsahu (žádná kvantovací
    mřížka navíc, dekódovaná hodnota je vždy PŘESNĚ to zaokrouhlené celé číslo). "Pevná řádová
    čárka" = stejné rovnoměrné kvantování jako dřív, ale s NASTAVITELNÝM počtem bitů (slider,
    default 8) — méně bitů = hrubší krok při zachování celého rozsahu (to je ten "kompromis
    rozsah/přesnost při fixním počtu bitů" ze spec 5.2). "Float" = dřívější pevných 16 bitů
    (`BITS_PER_COEFF_FLOAT`), referenční jemné rozlišení.
  - Obě osy dohromady umožňují extrémní kombinaci (např. vysoký stupeň + "přímá" + "celá čísla")
    demonstrující, že evoluce nenajde dobré řešení kvůli kódování, ne kvůli strategii — přesně
    cíl spec 5.
- **Stupeň jako součást genomu (spec 6) — konkrétní mechanika:** žádné nové pole "degree" na
  jedinci — stupeň jedince je odvozený přímo z `coeffs.length - 1` (jednodušší než držet dvě
  hodnoty, co by musely zůstat synchronní). Existující `degree-slider` se zapnutým checkboxem
  přeznačí na STROP (max. stupeň), ne na pevnou hodnotu — žádný nový ovládací prvek navíc.
  Mutace koeficientů (bit-flip i gaussian-jump) proto odvozuje kódovaný/mutovaný stupeň z délky
  vektoru, ne z `params.degree` přímo (v pevném režimu jsou to vždycky stejná čísla, takže nulová
  změna chování). Křížení dvou rodičů RŮZNÉHO stupně: oba vektory koeficientů se doplní nulami na
  stejnou délku (`padCoeffsToDegree`), zkříží se normálně (jakoukoli zvolenou variantou), a teprve
  výsledek se ořízne na stupeň zděděný od jednoho z rodičů (spec 6 to explicitně žádá — "převzetí
  od jednoho z rodičů", žádná interpolace stupně).
- **Historie nejlepších — strop na délku (spec 3):** stopa je omezená na posledních 150 generací
  (`HISTORY_MAX_LENGTH` v main.js), ne neomezená od resetu. Bez stropu by při dlouhém běhu rostlo
  pole koeficientů bez mezí (a s ním čas překreslení každého snímku — kreslí se všechny záznamy
  najednou), zatímco přínos "vidět dál do minulosti" je za určitou hranicí prakticky nulový (staré
  záznamy jsou skoro průhledné). Reset (libovolný) historii vždy vymaže.
- **Mutace/křížení — sjednocený výběr bit/doménová varianta:** stejně jako EvoMice (jeden
  `mutation-type-select`/`crossover-type-select` nabízející obě rodiny vedle sebe, ne
  samostatný přepínač "reprezentace"), viz spec 4 a EvoMice 6a.

## Plán fází

**Stav k 2026-09-11 — všech 14 bodů plánu hotovo a ověřeno** (viz git historie, jeden commit na
bod). Shrnutí ověření: self-testy (`console.assert`) v `model.js` (415 dílčích ověření) a `ga.js`
(494 dílčích ověření) prochází bez chyby; Chromium screenshoty pokrývají vykreslení bodů/populace,
klik přidej/smaž/tažení bodu, běh evoluce (bitová i doménová varianta, SSE i hit-count fitness),
všechny kombinace reprezentace genomu, stupeň jako genom (over/underfitting), historii nejlepších
a responzivní layout na 1600×1000/900×500/420×900. `[x]` níže znamená skutečně tohle, ne jen že
kód existuje — detaily a čísla u každého bodu.

1. [x] Kostra stránky (HTML/CSS/canvas) + i18n skeleton (cs/en) — hotovo a ověřeno
2. [x] Vykreslení bodů + interakce myší — vykreslení, klik přidej/smaž (14→15→14) i tažení bodu (drag, ověřeno syntetickými eventy: bod se přesunul {2,1}→{3,1}, počet bodů zůstal 14) — všechno ověřeno
3. [x] Model polynomu + fitness (SSE) — self-testy prochází, SSE viditelně klesá při běhu evoluce
4. [x] Evoluční jádro — bitová varianta — výchozí nastavení (bit-flip/one-point) ověřeno funkční (konvergence vidět na screenshotu)
5. [x] Evoluční jádro — doménová/geometrická varianta — ověřeno Chromium screenshotem (mutation-type=gaussian-jump, crossover-type=line-point v UI): populace po 60 generacích viditelně konverguje (SSE 10.601), bez chyby
6. [x] UI nastavení + centralizované defaulty (`defaults.js`) — propojeno, `applyInitialSettings()` funguje (viditelné hodnoty na screenshotu odpovídají DEFAULT_SETTINGS)
7. [x] Vizualizace kvality populace (sytost/průhlednost podle fitness) — viditelné na screenshotu (svazek křivek houstne kolem bodů s klesajícím SSE)
8. [x] Responzivní layout — Chromium screenshoty na 1600×1000, 900×500 (úzký landscape) i 420×900 (portrait) — žádné přetékání; jeden nalezený a opravený bug (nechtěný vodorovný scrollbar v prostředním pruhu/panelu nastavení kvůli `overflow-y: auto` bez `overflow-x`, viz CSS spec kombinace os — opraveno přidáním `overflow-x: hidden`)
9. [x] README.md — přehled projektu, jak spustit, co stránka umí, struktura kódu
10. [x] Reprezentace genomu (spec 5) — transformace přímá/normalizovaná × celá/pevná/float, konkrétní interpretace obou os viz "Architektonická rozhodnutí"; self-testy (415 dílčích ověření v model.js) i Chromium ověření dvou netriviálních kombinací (degree 1 + přímá + celá čísla; degree 6 + transformovaná + pevná řádová čárka 4 bity) bez chyby, populace v obou konverguje
11. [x] Stupeň polynomu jako součást genomu (spec 6) — checkbox "Stupeň je součást genomu" (degree-slider se stává stropem), mutace ±1 (podmíněně zobrazený slider míry), křížení = převzetí stupně od jednoho z rodičů (koeficienty se kříží na doplněných/vyrovnaných vektorech, pak ořežou); self-testy (494 dílčích ověření v ga.js) i Chromium ověření (degree cap 8, po 80 generacích nejlepší jedinec má stupeň 5 — jiný než strop, viditelná různorodost tvarů křivek v populaci)
12. [x] Další fitness metriky + vysvětlení v UI (spec 7) — přidány "maximální odchylka" a "počet netrefených bodů" (s podmíněně zobrazenou tolerancí, spec 13.8 vzor); tooltip vysvětluje jen mechanismus (jak se metrika počítá), ne proč je "počet trefených bodů" problematická metrika (spec 7: necháme studenty objevit sami); ověřeno Chromium screenshotem (přepnutí na hit-count, statistický řádek správně ukazuje "8/14 trefeno", populace viditelně méně konverguje než u SSE — přesně očekávaný důsledek chybějícího gradientu)
13. [x] Historie nejlepších jedinců, blednoucí stopa (spec 3) — checkbox "Historie nejlepších jedinců" (fieldset Zobrazení), stopa se plní v `stepOnce()` PŘED evolučním krokem (aktuální nejlepší jedinec se zapíše, teprve pak vznikne nová generace) a maže se při libovolném resetu; ověřeno screenshotem (purpurová stopa viditelná mezi modrými křivkami populace, viz zoomovaný výřez)
14. [x] Přirozená čísla pro souřadnice bodů (spec 2) — ověřeno: `generateInitialPoints` posune y (ať minimum vyjde ≥0) a zaokrouhlí, `clampWorldPoint` (ruční editace myší) zaokrouhluje a ořezává na [0, yMax]/[WORLD_X_MIN, WORLD_X_MAX]; self-testy (200 dílčích ověření v model.js) i JSON dump reálných vygenerovaných bodů v Chromium potvrzují jen celá nezáporná čísla

`[~]` = kód možná existuje, ale NEOVĚŘENO během stránky v prohlížeči — nepovažuj za hotové, dokud
to nevidíš fungovat na screenshotu.

Malé samostatně commitovatelné kroky, commit+push po každém dokončeném kroku.

## Vizuální ověřování

Na VM je nainstalované skutečné headless Chromium — použij ho na reálné screenshoty před
commitem cokoliv layoutového (viz EvoMice PROGRESS.md pro historii, proč tohle je nutné).

```
cd EVA/CurveFitEA && python3 -m http.server 8532 --bind 127.0.0.1 &
chromium --headless --disable-gpu --no-sandbox --window-size=<W>,<H> \
  --screenshot=/home/agent/curvefit_check_<popis>.png "http://127.0.0.1:8532/index.html"
```

Screenshot cesta MUSÍ být v `$HOME` (snap sandbox), smazat po prohlédnutí, necommitovat.

## Poznámky za běhu

(doplní se v průběhu implementace)
