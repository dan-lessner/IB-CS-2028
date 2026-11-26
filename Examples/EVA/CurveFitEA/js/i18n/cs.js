// CurveFitEA — český slovník (výchozí jazyk). Viz js/i18n.js pro mechaniku.

var I18N_CS = {
  page_title: 'CurveFitEA',
  subtitle: 'Evoluční prokládání bodů polynomem — místo vzorce zkusmo, generaci po generaci.',

  // --- Prostřední pruh: ovládání běhu ---------------------------------------
  start_pause_btn_tooltip: 'Spustí nebo pozastaví průběh evoluce (jedna generace za tik, viz rychlost). Stejnou akci dělá i mezerník.',
  step_btn: 'Krok',
  step_btn_tooltip: 'Provede přesně jednu generaci (selekce, křížení, mutace) a zase zastaví.',
  reset_btn: 'Nová náhodná sada bodů (reset)',
  reset_btn_tooltip: 'Vygeneruje novou náhodnou sadu bodů (ze skrytého referenčního modelu) i novou náhodnou počáteční populaci, podle aktuálního seedu.',
  seed_label: 'Random seed',
  seed_label_tooltip: 'Číslo, které určuje celý náhodný běh (body i populaci) — stejný seed vždy dá stejný výsledek, pro opakovatelnost.',
  speed_label: 'Rychlost (generací/s)',
  speed_label_tooltip: 'Kolik generací evoluce proběhne za sekundu, když je spuštěná. Hodnota 0 = tlačítko běhu udělá jen jeden krok.',
  fullscreen_btn_tooltip: 'Přepne zobrazení plochy a ovládání běhu na celou obrazovku.',
  zoom_label: 'Zoom',
  zoom_label_tooltip: 'Přiblíží plochu — nad rámec dostupného místa se objeví posuvníky, tažením pravým tlačítkem myši lze výřezem posouvat.',
  cursor_position_none: 'Kurzor: mimo plochu',
  cursor_position_label: 'Kurzor: x = {x}, y = {y}',
  highlighted_curve_none: 'Zvýrazněná křivka: žádná (najeďte myší na křivku)',
  highlighted_curve_label: 'Zvýrazněná křivka — součet čtverců odchylek (SSE) = {sse}',
  start_btn: 'Start',
  pause_btn: 'Pauza',
  fullscreen_enter_btn: 'Celá obrazovka',
  fullscreen_exit_btn: 'Ukončit celou obrazovku',

  // --- Statistický řádek -----------------------------------------------------
  fitness_sse: 'součet čtverců odchylek (SSE)',
  fitness_mae: 'průměrná absolutní odchylka (MAE)',
  fitness_max_error: 'maximální odchylka',
  fitness_hit_count: 'počet netrefených bodů',
  stats_line: 'Generace: {gen} | Nejlepší jedinec — {metric}: {error}',
  stats_hit_count_value: '{hits}/{total} trefeno',
  stats_degree_suffix: '| stupeň: {degree}',

  // --- Sekce: stupeň polynomu -------------------------------------------------
  section_degree_legend: 'Stupeň polynomu',
  section_degree_legend_tooltip: 'Genom jedince = koeficienty polynomu tohoto stupně (stupeň 1 = přímka).',
  degree_label: 'Stupeň',
  degree_label_tooltip: 'Počet koeficientů genomu = stupeň + 1. Změna stupně restartuje populaci (jiná délka genomu), body zůstávají. Se zapnutým "stupeň je součást genomu" je tahle hodnota strop (maximální stupeň), ne pevná hodnota.',
  degree_evolves_label: 'Stupeň je součást genomu',
  degree_evolves_label_tooltip: 'Místo pevného stupně si ho evoluce sama volí a mění (mutace ±1, křížení = převzetí od jednoho z rodičů) — v mezích 0 až po hodnotu posuvníku Stupeň (ten pak funguje jako strop).',
  degree_mutation_rate_label: 'Míra mutace stupně',
  degree_mutation_rate_label_tooltip: 'Pravděpodobnost, že se při mutaci stupeň jedince posune o ±1 (nezávisle na mutaci samotných koeficientů).',

  // --- Sekce: velikost populace ------------------------------------------------
  section_population_legend: 'Populace',
  section_population_legend_tooltip: 'Kolik kandidátních křivek (jedinců) se vykresluje a vyvíjí současně.',
  population_size_label: 'Velikost populace',
  population_size_label_tooltip: 'Počet kandidátních křivek v jedné generaci. Při hodnotě 1 se deaktivují ovládací prvky křížení a turnajové selekce (nemá s kým soutěžit).',

  // --- Sekce: zobrazení ----------------------------------------------------------
  section_display_legend: 'Zobrazení',
  section_display_legend_tooltip: 'Nastavení toho, co se navíc kreslí přes plochu — na evoluci samotnou nemá vliv.',
  history_toggle_label: 'Historie nejlepších jedinců',
  history_toggle_label_tooltip: 'Přes plochu se navíc vykreslí nejlepší jedinec z každé předchozí generace (jinou barvou), s postupným blednutím směrem do minulosti.',

  // --- Sekce: fitness ----------------------------------------------------------
  section_fitness_legend: 'Fitness (chyba prokládání)',
  section_fitness_legend_tooltip: 'Metrika, podle které se posuzuje, jak dobře křivka sedí na body — nižší chyba = vyšší fitness.',
  fitness_type_label: 'Metrika chyby',
  fitness_type_label_tooltip: 'SSE = součet čtverců odchylek (metoda nejmenších čtverců). MAE = průměr absolutních hodnot odchylek. Maximální odchylka = nejhorší jednotlivá odchylka. Počet netrefených bodů = kolik bodů je od křivky dál než zadaná tolerance.',
  fitness_tolerance_label: 'Tolerance (trefení bodu)',
  fitness_tolerance_label_tooltip: 'Bod je považovaný za "trefený", pokud je jeho svislá vzdálenost od křivky nejvýš tolik.',

  // --- Sekce: selekce ------------------------------------------------------------
  section_selection_legend: 'Selekce rodičů',
  section_selection_legend_tooltip: 'Určuje, kteří jedinci se stanou rodiči nové generace — pravděpodobnost roste s fitness.',
  selection_method_label: 'Metoda selekce',
  selection_method_label_tooltip: 'Ruletová: šance na výběr je úměrná podílu fitness na celkovém součtu. Turnajová: z náhodné skupinky vyhraje jedinec s nejvyšší fitness.',
  selection_roulette: 'Ruletová (fitness-proporcionální)',
  selection_tournament: 'Turnajová',
  tournament_size_label: 'Velikost turnaje',
  tournament_size_label_tooltip: 'Kolik náhodných jedinců soutěží v jednom turnaji — vyhraje ten s nejvyšší fitness.',

  // --- Sekce: křížení --------------------------------------------------------
  section_crossover_legend: 'Křížení',
  section_crossover_legend_tooltip: 'Kombinuje genomy (koeficienty) dvou rodičů do genomu potomka — bitově, nebo přímo s koeficienty.',
  crossover_rate_label: 'Míra křížení',
  crossover_rate_label_tooltip: 'Pravděpodobnost, že potomek vznikne křížením dvou rodičů — jinak je jen mutovanou kopií jednoho rodiče.',
  crossover_type_label: 'Typ křížení',
  crossover_type_label_tooltip: 'Bitové varianty (jednobodové/vícebodové/uniformní) pracují nad bitovým zápisem koeficientů. Doménové varianty (střídání koeficientů, bod mezi rodiči) pracují přímo s reálnými čísly.',
  crossover_one_point: 'Jednobodové (bitové)',
  crossover_multi_point: 'Vícebodové (bitové)',
  crossover_uniform: 'Uniformní — po bitech (bitové)',
  crossover_param_alternate: 'Střídání celých koeficientů (doménové)',
  crossover_line_point: 'Bod mezi rodiči (doménové)',
  crossover_points_label: 'Počet bodů řezu',
  crossover_points_label_tooltip: 'Kolikrát se u vícebodového křížení střídá zdrojový rodič napříč bitovým řetězcem genomu.',

  // --- Sekce: reprezentace genomu (spec 5) --------------------------------------
  section_genome_legend: 'Reprezentace genomu',
  section_genome_legend_tooltip: 'Jak se koeficienty polynomu kódují do genomu pro bitové operátory (křížení/mutace) — nezávisle na tom, jaký je jejich stupeň nebo hodnota.',
  genome_transform_label: 'Transformace koeficientů',
  genome_transform_label_tooltip: 'Přímá: každý koeficient sdílí stejný rozsah bez ohledu na svůj řád. Transformovaná: rozsah (a tedy i přesnost) i-tého koeficientu se geometricky zužuje s rostoucím řádem.',
  genome_transform_direct: 'Přímá (sdílený rozsah)',
  genome_transform_normalized: 'Transformovaná (zužující se rozsah)',
  genome_numeric_label: 'Číselná reprezentace (jen bitové operátory)',
  genome_numeric_label_tooltip: 'Celá čísla: koeficient se zaokrouhlí, žádná desetinná místa. Pevná řádová čárka: nastavitelný počet bitů rovnoměrně pokrývá celý rozsah. Float: stejný princip, ale s pevně vysokým počtem bitů (jemné rozlišení).',
  genome_numeric_integer: 'Celá čísla',
  genome_numeric_fixed: 'Pevná řádová čárka',
  genome_numeric_float: 'Float',
  genome_fixed_bits_label: 'Počet bitů na koeficient',
  genome_fixed_bits_label_tooltip: 'Kolik bitů kóduje jeden koeficient u pevné řádové čárky — víc bitů = jemnější krok kvantování v rámci stejného rozsahu.',

  // --- Sekce: mutace ------------------------------------------------------------
  section_mutation_legend: 'Mutace',
  section_mutation_legend_tooltip: 'Náhodná změna genomu potomka — bitová (převrácení bitu), nebo doménová (drobný posun koeficientu).',
  mutation_type_label: 'Typ mutace',
  mutation_type_label_tooltip: 'Bit-flip: každý bit zakódovaného koeficientu se s danou pravděpodobností převrátí — u vysokého bitu jde o skokovou, drastickou změnu hodnoty. Gaussovský posun: koeficient se posune o malou náhodnou odchylku ve svém okolí, žádný skok na jinou hodnotu.',
  mutation_bit_flip: 'Bit-flip (bitové)',
  mutation_gaussian_jump: 'Gaussovský posun (doménové)',
  mutation_rate_label: 'Míra mutace (na bit)',
  mutation_rate_label_tooltip: 'Pravděpodobnost, že se jeden bit genomu při mutaci převrátí.',
  mutation_sigma_label: 'Síla mutace (směr. odchylka)',
  mutation_sigma_label_tooltip: 'Směrodatná odchylka gaussovského posunu, o který se koeficient při mutaci náhodně posune.',

  // --- Sekce: elitismus a náhrada generace --------------------------------------
  section_elitism_legend: 'Náhrada generace a elitismus',
  section_elitism_legend_tooltip: 'Náhrada generace určuje, kolik jedinců se za krok obmění celkem; elitismus navíc zaručuje přežití konkrétních nejlepších jedinců beze změny.',
  replacement_mode_label: 'Náhrada generace',
  replacement_mode_label_tooltip: '"Celá generace" nahradí najednou všechny ne-elitní jedince. "Postupná" nahradí jen zadané procento nejhorších, zbytek přežívá beze záruky, že jde o nejlepší.',
  replacement_full: 'Celá generace najednou',
  replacement_partial: 'Postupná (jen nejhorší X %)',
  replacement_percent_label: 'Procento nahrazovaných',
  replacement_percent_label_tooltip: 'Kolik procent ne-elitních jedinců (těch nejhorších) se v jedné generaci nahradí novými potomky.',
  elite_count_label: 'Počet elitních jedinců',
  elite_count_label_tooltip: 'Kolik nejlepších jedinců přežije do další generace beze změny, bez ohledu na náhradu generace.',

  // --- Sekce: reset na výchozí ---------------------------------------------------
  section_reset_legend: 'Výchozí nastavení',
  section_reset_legend_tooltip: 'Vrátí všechna nastavení evoluce na výchozí hodnoty a rovnou provede reset bodů i populace.',
  reset_defaults_btn: 'Reset na výchozí nastavení',
  reset_defaults_btn_tooltip: 'Nastaví všechny ovládací prvky na výchozí hodnoty a restartuje simulaci.'
};
