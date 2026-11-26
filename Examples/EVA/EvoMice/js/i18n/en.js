// EvoMice — English translation dictionary (see js/i18n.js for the translation mechanism).
//
// Keys are grouped in the same order they appear in index.html, to make it
// easy to find things. `{name}` inside a text is a placeholder substituted
// by the t() function (see js/i18n.js). Keep the exact same key set as
// js/i18n/cs.js — adding a language means adding a file like this one, with
// no changes anywhere else in the code.

var I18N_EN = {

  page_title: 'EvoMice — evolving bacteria simulation',
  subtitle: 'Evolutionary simulation of bacteria on a Petri dish searching for food (genetic algorithm)',

  stats_line: 'generation: {gen} · fed: {fed} / {total}',

  cursor_position_none: 'cursor: outside the area',
  cursor_position_label: 'cursor: x = {x}, y = {y}',
  cursor_bacteria_segment: ' · bacteria on cell: {count}',
  cursor_food_segment: ' · food: {amount}/{capacity}',

  fullscreen_enter_btn: 'Fullscreen',
  fullscreen_exit_btn: 'Exit fullscreen',

  fitness_chart_title: 'Population fitness since last restart',
  fitness_chart_legend_min: 'minimum',
  fitness_chart_legend_avg: 'average',
  fitness_chart_legend_max: 'maximum',

  start_btn: 'Start',
  pause_btn: 'Pause',
  step_btn: 'Step',
  reset_btn: 'New random population (reset)',
  speed_label: 'Speed (generations/s):',

  section_population_legend: 'Population and area',
  population_size_label: 'Population size:',
  grid_size_label: 'Area size (cells per side):',

  section_food_legend: 'Food',
  food_count_label: 'Amount of food:',
  food_capacity_label: 'Food capacity (generations):',
  food_mode_random: 'Random scatter',
  food_mode_manual: 'Manual drawing (click/drag over the area)',
  regenerate_food_btn: 'Scatter food again',
  clear_food_btn: 'Clear food',
  food_depletes_label: 'Food depletes once "eaten"',
  food_replenishes_label: 'Depleted food is replenished at new random spots',

  section_fitness_legend: 'Fitness',
  fitness_type_label: 'Shape of the fitness function',
  fitness_binary: 'binary (on food / not on food)',
  fitness_continuous: 'continuous (decreases with distance)',

  section_selection_legend: 'Parent selection',
  selection_method_label: 'Method',
  selection_roulette: 'roulette (fitness-proportional)',
  selection_tournament: 'tournament',
  tournament_size_label: 'Tournament size (tournament only):',

  section_crossover_legend: 'Crossover',
  crossover_rate_label: 'Crossover rate (otherwise a mutated copy):',
  crossover_type_label: 'Crossover type',
  crossover_xy_split: 'whole x from parent A + whole y from parent B',
  crossover_one_point: 'single-point (bitwise)',
  crossover_multi_point: 'multi-point (bitwise)',
  crossover_uniform: 'per-bit (uniform)',
  crossover_line_point: 'point on the line between parents (geometric)',
  crossover_rectangle_point: 'point in the parents’ rectangle (geometric)',
  crossover_points_label: 'Number of cut points (multi-point only):',

  section_mutation_legend: 'Mutation',
  mutation_type_label: 'Mutation type',
  mutation_bit_flip: 'bit flip (bitwise)',
  mutation_geometric_jump: 'jump nearby (geometric)',
  mutation_rate_label: 'Mutation rate per bit (bitwise only):',
  mutation_jump_radius_label: 'Jump radius in cells (geometric only):',

  section_elitism_legend: 'Elitism and generation replacement',
  elite_count_label: 'Number of elite individuals:',
  replacement_mode_label: 'Generation replacement',
  replacement_full: 'whole generation at once (dies immediately)',
  replacement_partial: 'gradually, worst X % (survives until replaced by a better offspring)',
  replacement_percent_label: 'What % gets replaced (gradual only):',

  seed_label: 'Seed',

  zoom_label: 'Zoom level',

  section_saveload_legend: 'Save and load',
  reset_defaults_btn: 'Reset to default settings',
  saveload_include_board_label: 'Also save the board state (bacteria, food)',
  save_cookie_btn: 'Save to cookie',
  load_cookie_btn: 'Load from cookie',
  clear_cookie_btn: 'Clear cookie',
  save_link_btn: 'Save to link',
  save_link_output_label: 'Link (copy with Ctrl+C):',
  cookie_consent_message: 'Saving to a cookie means this browser will store the current simulation settings (optionally also bacteria and food positions) on this device, until you delete it yourself or it expires (1 year). Continue?',
  saveload_status_cookie_declined: 'Saving to cookie cancelled — consent was not given.',
  saveload_status_cookie_saved: 'Settings saved to cookie.',
  saveload_status_cookie_missing: 'No data found in the cookie.',
  saveload_status_cookie_corrupt: 'Could not read the data stored in the cookie.',
  saveload_status_cookie_loaded: 'Settings loaded from cookie.',
  saveload_status_cookie_cleared: 'Cookie with saved settings deleted.',
  saveload_status_link_ready: 'Link generated and selected — copy it (Ctrl+C).',
  saveload_status_link_loaded: 'Settings loaded from the link.',
  saveload_status_defaults_applied: 'Settings reset to defaults.',

  // --- Tooltips -----------------------------------------------------------
  //
  // Same two content rules as js/i18n/cs.js (see spec 8.3):
  //   - section heading (*_legend_tooltip): a short reminder of the GA
  //     concept, the reader already knows terms like fitness/selection/
  //     crossover/mutation
  //   - specific control (*_tooltip): only the technical mechanic (what is
  //     computed/what happens), never the consequence for the simulation's
  //     behavior — that's for the student to observe by experimenting

  fullscreen_btn_tooltip: 'Shows the simulation area (and the information below it) across the whole screen, without the settings panel. Cell size adjusts to fit.',

  start_pause_btn_tooltip: 'This button toggles repeated calls to the generation step on and off, at a regular interval set by the speed control. The space bar does the same thing (unless another control currently has focus).',
  step_btn_tooltip: 'Runs exactly one step of evolution (one generation evaluation) and stays paused.',
  reset_btn_tooltip: 'Creates a new random starting population with the same parameters and resets the generation counter.',
  speed_label_tooltip: 'Sets how many times per second a generation step runs automatically while running. At 0, "Start" (and the space bar) just runs a single step, same as the "Step" button.',

  section_population_legend_tooltip: 'The population is the set of individuals (bacteria) from which parents are chosen each generation; the area size sets the length of the binary genome.',
  population_size_label_tooltip: 'Changes the number of bacteria in the population; growing it adds new random individuals, shrinking it removes some.',
  grid_size_label_tooltip: 'Changes the number of cells per side of the grid, and therefore the length of the binary genome (bits per axis) — requires a full simulation reset.',

  section_food_legend_tooltip: 'Food defines the environment against which each bacterium’s fitness is computed. A cell’s color shows how much food is left there (black to green), while a bacterium’s inner square is colored by how many other bacteria stand on the same cell (yellow to red).',
  food_count_label_tooltip: 'Sets how many food cells are created by a random scatter.',
  food_capacity_label_tooltip: 'How many generations (how many times "eaten") one food cell lasts before running out — the higher, the slower food depletes. A food cell’s color on the area shows how much of its capacity is left (black = gone, green = full).',
  food_mode_random_tooltip: 'The given number of food cells is placed on randomly chosen grid cells.',
  food_mode_manual_tooltip: 'Food cells are set by clicking or dragging the mouse cursor directly over the area.',
  regenerate_food_btn_tooltip: 'Scatters food randomly again, using the currently set amount.',
  clear_food_btn_tooltip: 'Removes all food currently placed on the area.',
  food_depletes_label_tooltip: 'After a generation is evaluated, food on cells that had at least one bacterium on them depletes.',
  food_replenishes_label_tooltip: 'Depleted food is replenished back up to the original count, at new random locations — regardless of whether it was scattered randomly or drawn manually.',

  section_fitness_legend_tooltip: 'Fitness expresses how well an individual is adapted to its environment — here, how a bacterium’s position relates to food.',
  fitness_type_label_tooltip: 'The binary variant scores fitness 1 if the bacterium is exactly on a food cell, otherwise 0. The continuous variant scores fitness as 1 / (1 + distance) to the nearest food.',

  section_selection_legend_tooltip: 'Selection decides which individuals become parents of the next generation — higher fitness means a higher chance.',
  selection_method_label_tooltip: 'Roulette selection picks a parent with probability proportional to its share of the population’s total fitness. Tournament selection picks a random group of individuals and the one with the highest fitness in it becomes the parent.',
  tournament_size_label_tooltip: 'How many randomly chosen individuals compete against each other in tournament selection to become a parent.',

  section_crossover_legend_tooltip: 'Crossover combines the genomes of two parents into the offspring’s genome.',
  crossover_rate_label_tooltip: 'The probability that a new individual is produced by crossing two parents; otherwise it is a mutated copy of a single selected parent.',
  crossover_type_label_tooltip: 'Chooses the mechanism that combines the two parents’ coordinates into the offspring’s coordinate — the exact description of each variant is on its entry in the list.',
  crossover_points_label_tooltip: 'How many random cut points are chosen along the binary genome; the source parent (A/B) alternates between consecutive points.',

  section_mutation_legend_tooltip: 'Mutation introduces a random change in the offspring, independent of the parents.',
  mutation_type_label_tooltip: 'Chooses the offspring mutation mechanism — flipping individual genome bits, or shifting the coordinate by a random vector in space.',
  mutation_rate_label_tooltip: 'The probability that an individual bit of the binary genome is flipped during mutation (bitwise mutation only).',
  mutation_jump_radius_label_tooltip: 'The maximum size of the random coordinate shift on each axis during geometric mutation (geometric mutation only).',

  section_elitism_legend_tooltip: 'Elitism and generation replacement control how many individuals survive unchanged and how the old generation is replaced by the new one.',
  elite_count_label_tooltip: 'How many of the best individuals by fitness pass into the next generation unchanged, without crossover or mutation.',
  replacement_mode_label_tooltip: '"Whole generation" replaces all non-elite individuals at once with new offspring. "Gradual" replaces only the given percentage of the worst ones, the rest stays unchanged.',
  replacement_percent_label_tooltip: 'What percentage of non-elite individuals (the lowest fitness ones) gets replaced with new offspring in gradual mode.',

  seed_label_tooltip: 'The number used to initialize the pseudo-random number generator — makes the simulation run repeatable, the same seed leads to the same run. The "New random population (reset)" button always uses the current value of this field.',

  zoom_label_tooltip: 'Scales the rendered simulation panel using a CSS transform; it does not affect grid resolution or coordinate precision.',

  section_saveload_legend_tooltip: 'The current settings (optionally also bacteria and food positions) can be saved to a browser cookie or to a link, and loaded back later.',
  saveload_include_board_label_tooltip: 'When on, the exact positions of all bacteria and food are saved/restored too, not just the control values.',
  save_cookie_btn_tooltip: 'Saves the current settings (and optionally the board state) to a cookie in this browser — the first time asks for explicit consent.',
  load_cookie_btn_tooltip: 'Sets the controls and resets the simulation from the data last saved to the cookie.',
  clear_cookie_btn_tooltip: 'Deletes the cookie with saved settings from this browser.',
  save_link_btn_tooltip: 'Generates a URL with the current settings (and optionally the board state) encoded in a parameter — opening this link loads the same data again.',
  reset_defaults_btn_tooltip: 'Resets every setting control to its default value (defined in one place in js/save-load.js) and resets the simulation.'

};
