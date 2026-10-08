// EvoMice — český slovník textů rozhraní (viz js/i18n.js pro mechaniku překladu).
//
// Klíče jsou seskupené ve stejném pořadí, v jakém se objevují v index.html,
// ať se v tom dá snadno orientovat. `{jmeno}` v textu je placeholder
// nahrazovaný funkcí t() (viz js/i18n.js).

var I18N_CS = {

  page_title: 'EvoMice — evoluční simulace bakterií',
  subtitle: 'Evoluční simulace bakterií na Petriho misce hledajících krmení (genetický algoritmus)',

  stats_line: 'generace: {gen} · nakrmeno: {fed} / {total}',

  cursor_position_none: 'kurzor: mimo plochu',
  cursor_position_label: 'kurzor: x = {x}, y = {y}',
  cursor_bacteria_segment: ' · bakterií na buňce: {count}',
  cursor_food_segment: ' · krmení: {amount}/{capacity}',

  fullscreen_enter_btn: 'Celá obrazovka',
  fullscreen_exit_btn: 'Ukončit celou obrazovku',

  fitness_chart_title: 'Fitness populace od posledního restartu',
  fitness_chart_legend_min: 'minimum',
  fitness_chart_legend_avg: 'průměr',
  fitness_chart_legend_max: 'maximum',

  start_btn: 'Start',
  pause_btn: 'Pauza',
  step_btn: 'Krok po kroku',
  reset_btn: 'Nová náhodná populace (reset)',
  speed_label: 'Rychlost běhu (generací/s):',

  section_population_legend: 'Populace a plocha',
  population_size_label: 'Velikost populace:',
  grid_size_label: 'Velikost plochy (buněk na stranu):',

  section_food_legend: 'Krmení',
  food_count_label: 'Množství krmení:',
  food_capacity_label: 'Kapacita krmení (generací):',
  food_mode_random: 'Náhodné rozhození',
  food_mode_manual: 'Ruční kreslení (klikni/táhni po ploše)',
  regenerate_food_btn: 'Rozhoď krmení znovu',
  clear_food_btn: 'Vymazat krmení',
  food_depletes_label: 'Krmení po "snězení" ubývá',
  food_replenishes_label: 'Ubylé krmení se doplňuje na nová náhodná místa',

  section_fitness_legend: 'Fitness',
  fitness_type_label: 'Tvar fitness funkce',
  fitness_binary: 'binární (je / není na krmení)',
  fitness_continuous: 'spojitá (klesá se vzdáleností)',

  section_selection_legend: 'Selekce rodičů',
  selection_method_label: 'Metoda',
  selection_roulette: 'ruletová (fitness-proporcionální)',
  selection_tournament: 'turnajová',
  tournament_size_label: 'Velikost turnaje (jen pro turnajovou):',

  section_crossover_legend: 'Křížení',
  crossover_rate_label: 'Míra křížení (jinak jen mutovaná kopie):',
  crossover_type_label: 'Typ křížení',
  crossover_xy_split: 'celé x od rodiče A + celé y od rodiče B',
  crossover_one_point: 'jednobodový (bitový)',
  crossover_multi_point: 'vícebodový (bitový)',
  crossover_uniform: 'per-bit (uniformní)',
  crossover_line_point: 'bod na spojnici rodičů (geometrický)',
  crossover_rectangle_point: 'bod v obdélníku rodičů (geometrický)',
  crossover_points_label: 'Počet bodů řezu (jen pro vícebodový):',

  section_mutation_legend: 'Mutace',
  mutation_type_label: 'Typ mutace',
  mutation_bit_flip: 'převrácení bitu (bitová)',
  mutation_geometric_jump: 'skok do okolí (geometrická)',
  mutation_rate_label: 'Míra mutace na bit (jen pro bitovou):',
  mutation_jump_radius_label: 'Poloměr skoku v buňkách (jen pro geometrickou):',

  section_elitism_legend: 'Elitismus a náhrada generace',
  elite_count_label: 'Počet elitních jedinců:',
  replacement_mode_label: 'Náhrada generace',
  replacement_full: 'celá generace najednou (umírá okamžitě)',
  replacement_partial: 'postupně nejhorší X % (přežívá dokud ji nenahradí lepší)',
  replacement_percent_label: 'Kolik % se nahradí (jen pro postupnou):',

  seed_label: 'Seed',

  zoom_label: 'Přiblížení',

  section_saveload_legend: 'Uložení a načtení',
  reset_defaults_btn: 'Reset na výchozí nastavení',
  saveload_include_board_label: 'Uložit i stav plochy (bakterie, krmení)',
  save_cookie_btn: 'Uložit do cookie',
  load_cookie_btn: 'Načíst z cookie',
  clear_cookie_btn: 'Smazat cookie',
  save_link_btn: 'Uložit do odkazu',
  save_link_output_label: 'Odkaz (zkopírovat Ctrl+C):',
  cookie_consent_message: 'Uložení do cookie znamená, že si prohlížeč na tomto zařízení uloží aktuální nastavení simulace (volitelně i pozice bakterií a krmení) do souboru cookie, dokud ho sami nesmažete nebo nevyprší platnost (1 rok). Pokračovat?',
  saveload_status_cookie_declined: 'Uložení do cookie zrušeno — souhlas nebyl udělen.',
  saveload_status_cookie_saved: 'Nastavení uloženo do cookie.',
  saveload_status_cookie_missing: 'V cookie nejsou uložená žádná data.',
  saveload_status_cookie_corrupt: 'Data v cookie se nepodařilo přečíst.',
  saveload_status_cookie_loaded: 'Nastavení načteno z cookie.',
  saveload_status_cookie_cleared: 'Cookie s uloženým nastavením smazána.',
  saveload_status_link_ready: 'Odkaz vygenerován a označen — zkopírujte ho (Ctrl+C).',
  saveload_status_link_loaded: 'Nastavení načteno z odkazu.',
  saveload_status_defaults_applied: 'Nastavení vráceno na výchozí hodnoty.',

  // --- Tooltipy ---------------------------------------------------------
  //
  // Dvě odlišná pravidla obsahu (viz spec 8.3):
  //   - u nadpisu sekce (*_legend_tooltip): krátké připomenutí konceptu GA,
  //     čtenář (budoucí maturant z informatiky) pojmy jako fitness/selekce/
  //     křížení/mutace už zná
  //   - u konkrétní volby (*_tooltip): jen technický popis mechaniky (co se
  //     počítá/děje), nikdy důsledek pro chování simulace — to má být to,
  //     co si student vypozoruje sám experimentováním

  fullscreen_btn_tooltip: 'Zobrazí plochu se simulací (a informace pod ní) přes celou obrazovku, bez panelu nastavení. Velikost buněk se tomu přizpůsobí.',

  start_pause_btn_tooltip: 'Tlačítko střídavě spouští a zastavuje opakované volání kroku generace v pravidelném intervalu daném nastavenou rychlostí. Stejnou funkci má i mezerník (pokud fokus nemá jiný ovládací prvek).',
  step_btn_tooltip: 'Provede přesně jeden krok evoluce (jedno vyhodnocení generace) a zůstane zastavené.',
  reset_btn_tooltip: 'Vytvoří novou náhodnou počáteční populaci se stejnými parametry a vynuluje počítadlo generací.',
  speed_label_tooltip: 'Určuje, kolikrát za sekundu se při spuštěném běhu automaticky provede krok generace. Při 0 "Start" (i mezerník) jen provede jeden krok, stejně jako tlačítko "Krok po kroku".',

  section_population_legend_tooltip: 'Populace je množina jedinců (bakterií), z níž se v každé generaci vybírají rodiče; velikost mřížky určuje délku binárního genomu.',
  population_size_label_tooltip: 'Mění počet bakterií v populaci; při zvětšení se přidají nové náhodné jedinci, při zmenšení se odeberou.',
  grid_size_label_tooltip: 'Mění počet buněk mřížky na stranu, a tím i délku binárního genomu (počet bitů na osu) — vyžaduje kompletní reset simulace.',

  section_food_legend_tooltip: 'Krmení definuje prostředí, vůči kterému se počítá fitness jednotlivých bakterií. Barva buňky na ploše ukazuje zbývající množství krmení (černá až zelená), vnitřní čtverec bakterie barvu podle toho, kolik dalších bakterií stojí na stejné buňce (žlutá až červená).',
  food_count_label_tooltip: 'Určuje, kolik buněk krmení vznikne při náhodném rozhození.',
  food_capacity_label_tooltip: 'Kolik generací (kolikrát "snězeno") vydrží jedna buňka krmení, než dojde — čím výše, tím pomaleji krmení ubývá. Barva buňky krmení na ploše ukazuje, kolik z kapacity ještě zbývá (černá = došlo, zelená = plná).',
  food_mode_random_tooltip: 'Zadaný počet krmítek se umístí na náhodně vybrané buňky mřížky.',
  food_mode_manual_tooltip: 'Buňky krmení se určují kliknutím nebo tažením kurzoru myši přímo po ploše.',
  regenerate_food_btn_tooltip: 'Znovu náhodně rozmístí krmení podle aktuálně nastaveného množství.',
  clear_food_btn_tooltip: 'Odstraní veškeré aktuálně umístěné krmení z plochy.',
  food_depletes_label_tooltip: 'Po vyhodnocení generace ubyde krmení na buňkách, kde stála aspoň jedna bakterie.',
  food_replenishes_label_tooltip: 'Krmení, které ubylo, se doplní zpátky na původní počet na nová náhodná místa — nezávisle na tom, jestli bylo rozhozeno náhodně nebo nakresleno ručně.',

  section_fitness_legend_tooltip: 'Fitness vyjadřuje, jak dobře je jedinec přizpůsobený prostředí — tady jde o polohu bakterie vůči krmení.',
  fitness_type_label_tooltip: 'Binární varianta počítá fitness 1, pokud bakterie stojí přesně na buňce s krmením, jinak 0. Spojitá varianta počítá fitness jako 1 / (1 + vzdálenost) k nejbližšímu krmení.',

  section_selection_legend_tooltip: 'Selekce rozhoduje, kteří jedinci se stanou rodiči další generace — čím vyšší fitness, tím vyšší šance.',
  selection_method_label_tooltip: 'Ruletová selekce vybírá rodiče s pravděpodobností úměrnou jeho podílu na celkové fitness populace. Turnajová selekce vybere náhodnou skupinu jedinců a rodičem se stane ten s nejvyšší fitness v ní.',
  tournament_size_label_tooltip: 'Kolik náhodně vybraných jedinců spolu v turnajové selekci soupeří o to, kdo se stane rodičem.',

  section_crossover_legend_tooltip: 'Křížení kombinuje genomy dvou rodičů do genomu potomka.',
  crossover_rate_label_tooltip: 'Pravděpodobnost, že nový jedinec vznikne křížením dvou rodičů; jinak vznikne jako mutovaná kopie jediného vybraného rodiče.',
  crossover_type_label_tooltip: 'Volí mechanismus, kterým se souřadnice dvou rodičů zkombinují do souřadnice potomka — přesný popis každé varianty je u příslušné položky v seznamu.',
  crossover_points_label_tooltip: 'Kolik náhodných bodů řezu se zvolí podél binárního genomu; mezi sousedními body se zdrojový rodič (A/B) střídá.',

  section_mutation_legend_tooltip: 'Mutace vnáší do potomka náhodnou odchylku nezávislou na rodičích.',
  mutation_type_label_tooltip: 'Volí mechanismus mutace potomka — převrácení jednotlivých bitů genomu, nebo posun souřadnice o náhodný vektor v prostoru.',
  mutation_rate_label_tooltip: 'Pravděpodobnost, že se jednotlivý bit binárního genomu při mutaci převrátí (jen pro bitovou mutaci).',
  mutation_jump_radius_label_tooltip: 'Maximální velikost náhodného posunu souřadnice na každé ose při geometrické mutaci (jen pro geometrickou mutaci).',

  section_elitism_legend_tooltip: 'Elitismus a náhrada generace určují, kolik jedinců přežívá beze změny a jak se stará generace nahrazuje novou.',
  elite_count_label_tooltip: 'Kolik nejlepších jedinců podle fitness přejde do další generace beze změny, bez křížení a mutace.',
  replacement_mode_label_tooltip: '"Celá generace" nahradí najednou všechny ne-elitní jedince novými potomky. "Postupná" nahradí jen zadané procento nejhorších, zbytek zůstává beze změny.',
  replacement_percent_label_tooltip: 'Kolik procent ne-elitních jedinců (s nejnižší fitness) se v postupném režimu nahradí novými potomky.',

  seed_label_tooltip: 'Číslo, kterým se inicializuje generátor pseudonáhodných čísel — dělá běh simulace opakovatelný, stejný seed vede ke stejnému průběhu. Tlačítko "Nová náhodná populace (reset)" vždycky použije aktuální hodnotu tohohle pole.',

  zoom_label_tooltip: 'Škáluje vykreslený panel simulace pomocí CSS transformace; neovlivňuje velikost mřížky ani přesnost souřadnic.',

  section_saveload_legend_tooltip: 'Aktuální nastavení (volitelně i pozice bakterií a krmení) jde uložit do cookie prohlížeče nebo do odkazu, a později zase načíst zpátky.',
  saveload_include_board_label_tooltip: 'Když je zapnuto, uloží/obnoví se i přesné pozice všech bakterií a krmení, ne jen hodnoty ovládacích prvků.',
  save_cookie_btn_tooltip: 'Uloží aktuální nastavení (a volitelně stav plochy) do cookie v tomto prohlížeči — poprvé si vyžádá výslovný souhlas.',
  load_cookie_btn_tooltip: 'Nastaví ovládací prvky a resetuje simulaci podle dat naposledy uložených do cookie.',
  clear_cookie_btn_tooltip: 'Smaže cookie s uloženým nastavením z tohoto prohlížeče.',
  save_link_btn_tooltip: 'Vygeneruje URL adresu s aktuálním nastavením (a volitelně stavem plochy) zakódovaným v parametru — otevřením tohohle odkazu se stejná data načtou znovu.',
  reset_defaults_btn_tooltip: 'Vrátí všechny ovládací prvky nastavení na výchozí hodnoty (definované na jednom místě v js/save-load.js) a resetuje simulaci.'

};
