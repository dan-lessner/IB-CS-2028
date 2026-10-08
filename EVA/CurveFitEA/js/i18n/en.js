// CurveFitEA — English dictionary. See js/i18n.js for the translation mechanism.

var I18N_EN = {
  page_title: 'CurveFitEA',
  subtitle: 'Evolutionary curve fitting — instead of a formula, search generation by generation.',

  // --- Middle panel: run controls ------------------------------------------
  start_pause_btn_tooltip: 'Starts or pauses the evolution run (one generation per tick, see speed). Space bar does the same.',
  step_btn: 'Step',
  step_btn_tooltip: 'Runs exactly one generation (selection, crossover, mutation) and stops again.',
  reset_btn: 'New random points (reset)',
  reset_btn_tooltip: 'Generates a new random set of points (from the hidden reference model) and a new random initial population, using the current seed.',
  seed_label: 'Random seed',
  seed_label_tooltip: 'A number that determines the whole random run (points and population) — the same seed always gives the same result, for reproducibility.',
  speed_label: 'Speed (generations/s)',
  speed_label_tooltip: 'How many generations run per second while running. Value 0 makes the run button perform just a single step.',
  fullscreen_btn_tooltip: 'Toggles fullscreen display of the plot area and run controls.',
  zoom_label: 'Zoom',
  zoom_label_tooltip: 'Zooms in on the plot area — beyond the available space, scrollbars appear; dragging with the right mouse button pans the view.',
  cursor_position_none: 'Cursor: outside the plot area',
  cursor_position_label: 'Cursor: x = {x}, y = {y}',
  highlighted_curve_none: 'Highlighted curve: none (hover over a curve)',
  highlighted_curve_label: 'Highlighted curve — sum of squared errors (SSE) = {sse}',
  start_btn: 'Start',
  pause_btn: 'Pause',
  fullscreen_enter_btn: 'Fullscreen',
  fullscreen_exit_btn: 'Exit fullscreen',

  // --- Stats line -----------------------------------------------------------
  fitness_sse: 'sum of squared errors (SSE)',
  fitness_mae: 'mean absolute error (MAE)',
  fitness_max_error: 'maximum error',
  fitness_hit_count: 'number of missed points',
  stats_line: 'Generation: {gen} | Best individual — {metric}: {error}',
  stats_hit_count_value: '{hits}/{total} hit',
  stats_degree_suffix: '| degree: {degree}',

  // --- Section: polynomial degree --------------------------------------------
  section_degree_legend: 'Polynomial degree',
  section_degree_legend_tooltip: 'The genome of an individual is the set of coefficients of a polynomial of this degree (degree 1 = a line).',
  degree_label: 'Degree',
  degree_label_tooltip: 'Number of genome coefficients = degree + 1. Changing the degree restarts the population (different genome length), points stay unchanged. With "degree is part of the genome" enabled, this value is a cap (maximum degree), not a fixed value.',
  degree_evolves_label: 'Degree is part of the genome',
  degree_evolves_label_tooltip: 'Instead of a fixed degree, evolution chooses and changes it itself (mutation ±1, crossover = inherited from one of the parents) — within 0 up to the Degree slider value (which then acts as a cap).',
  degree_mutation_rate_label: 'Degree mutation rate',
  degree_mutation_rate_label_tooltip: "Probability that an individual's degree shifts by ±1 during mutation (independent of mutating the coefficients themselves).",

  // --- Section: population -----------------------------------------------------
  section_population_legend: 'Population',
  section_population_legend_tooltip: 'How many candidate curves (individuals) are drawn and evolved at the same time.',
  population_size_label: 'Population size',
  population_size_label_tooltip: 'Number of candidate curves per generation. At value 1, crossover and tournament selection controls are disabled (nothing to compete with).',

  // --- Section: display -----------------------------------------------------------
  section_display_legend: 'Display',
  section_display_legend_tooltip: 'Settings for what gets drawn on the plot area in addition — has no effect on evolution itself.',
  history_toggle_label: 'Best-individual history',
  history_toggle_label_tooltip: 'Additionally draws the best individual from every previous generation (in a different colour), fading gradually into the past.',

  // --- Section: fitness -----------------------------------------------------------
  section_fitness_legend: 'Fitness (fitting error)',
  section_fitness_legend_tooltip: 'The metric used to judge how well a curve fits the points — lower error means higher fitness.',
  fitness_type_label: 'Error metric',
  fitness_type_label_tooltip: 'SSE = sum of squared errors (least squares method). MAE = mean of absolute error values. Maximum error = the single worst deviation. Number of missed points = how many points are farther from the curve than the given tolerance.',
  fitness_tolerance_label: 'Tolerance (point hit)',
  fitness_tolerance_label_tooltip: 'A point counts as "hit" if its vertical distance from the curve is at most this much.',

  // --- Section: selection --------------------------------------------------------
  section_selection_legend: 'Parent selection',
  section_selection_legend_tooltip: 'Determines which individuals become parents of the next generation — the probability grows with fitness.',
  selection_method_label: 'Selection method',
  selection_method_label_tooltip: 'Roulette: selection chance is proportional to the share of total fitness. Tournament: a random group competes, the highest-fitness one wins.',
  selection_roulette: 'Roulette (fitness-proportional)',
  selection_tournament: 'Tournament',
  tournament_size_label: 'Tournament size',
  tournament_size_label_tooltip: 'How many random individuals compete in one tournament — the one with the highest fitness wins.',

  // --- Section: crossover -----------------------------------------------------
  section_crossover_legend: 'Crossover',
  section_crossover_legend_tooltip: 'Combines the genomes (coefficients) of two parents into a child genome — bitwise, or directly with coefficient values.',
  crossover_rate_label: 'Crossover rate',
  crossover_rate_label_tooltip: 'Probability that a child is produced by crossing two parents — otherwise it is just a mutated copy of one parent.',
  crossover_type_label: 'Crossover type',
  crossover_type_label_tooltip: 'Bit-based variants (one-point/multi-point/uniform) operate on the bit encoding of coefficients. Domain variants (alternating coefficients, point between parents) operate directly on real numbers.',
  crossover_one_point: 'One-point (bit-based)',
  crossover_multi_point: 'Multi-point (bit-based)',
  crossover_uniform: 'Uniform — per bit (bit-based)',
  crossover_param_alternate: 'Alternate whole coefficients (domain)',
  crossover_line_point: 'Point between parents (domain)',
  crossover_points_label: 'Number of cut points',
  crossover_points_label_tooltip: 'How many times the source parent alternates across the genome bit string in multi-point crossover.',

  // --- Section: genome representation (spec 5) ------------------------------------
  section_genome_legend: 'Genome representation',
  section_genome_legend_tooltip: 'How polynomial coefficients get encoded into the genome for bit-based operators (crossover/mutation) — independent of their degree or value.',
  genome_transform_label: 'Coefficient transform',
  genome_transform_label_tooltip: 'Direct: every coefficient shares the same range regardless of its order. Transformed: the range (and thus precision) of the i-th coefficient shrinks geometrically as the order grows.',
  genome_transform_direct: 'Direct (shared range)',
  genome_transform_normalized: 'Transformed (shrinking range)',
  genome_numeric_label: 'Numeric representation (bit-based operators only)',
  genome_numeric_label_tooltip: 'Integer: the coefficient is rounded, no decimal places at all. Fixed-point: an adjustable number of bits evenly covers the whole range. Float: same principle, but with a fixed, high bit count (fine resolution).',
  genome_numeric_integer: 'Integer',
  genome_numeric_fixed: 'Fixed-point',
  genome_numeric_float: 'Float',
  genome_fixed_bits_label: 'Bits per coefficient',
  genome_fixed_bits_label_tooltip: 'How many bits encode a single coefficient in fixed-point mode — more bits means a finer quantization step within the same range.',

  // --- Section: mutation ---------------------------------------------------------
  section_mutation_legend: 'Mutation',
  section_mutation_legend_tooltip: 'A random change to a child genome — bitwise (bit flip), or domain-based (a small shift of a coefficient).',
  mutation_type_label: 'Mutation type',
  mutation_type_label_tooltip: 'Bit-flip: each bit of an encoded coefficient is flipped with a given probability — flipping a high-order bit is a sudden, drastic change of value. Gaussian jump: a coefficient is shifted by a small random amount in its neighbourhood, never a jump to an unrelated value.',
  mutation_bit_flip: 'Bit-flip (bit-based)',
  mutation_gaussian_jump: 'Gaussian jump (domain)',
  mutation_rate_label: 'Mutation rate (per bit)',
  mutation_rate_label_tooltip: 'Probability that a single genome bit gets flipped during mutation.',
  mutation_sigma_label: 'Mutation strength (std. deviation)',
  mutation_sigma_label_tooltip: 'Standard deviation of the Gaussian shift applied to a coefficient during mutation.',

  // --- Section: elitism and generation replacement --------------------------------
  section_elitism_legend: 'Generation replacement and elitism',
  section_elitism_legend_tooltip: 'Generation replacement sets how many individuals get replaced per step overall; elitism additionally guarantees that specific best individuals survive unchanged.',
  replacement_mode_label: 'Generation replacement',
  replacement_mode_label_tooltip: '"Full generation" replaces all non-elite individuals at once. "Partial" replaces only the given percentage of the worst ones, the rest survives with no guarantee of being the best.',
  replacement_full: 'Full generation at once',
  replacement_partial: 'Partial (worst X % only)',
  replacement_percent_label: 'Percent replaced',
  replacement_percent_label_tooltip: 'What percentage of non-elite individuals (the worst ones) gets replaced by new offspring in one generation.',
  elite_count_label: 'Number of elite individuals',
  elite_count_label_tooltip: 'How many top individuals survive into the next generation unchanged, regardless of generation replacement.',

  // --- Section: reset to defaults --------------------------------------------------
  section_reset_legend: 'Default settings',
  section_reset_legend_tooltip: 'Resets all evolution settings to their default values and immediately resets both points and population.',
  reset_defaults_btn: 'Reset to default settings',
  reset_defaults_btn_tooltip: 'Sets all controls to their default values and restarts the simulation.'
};
