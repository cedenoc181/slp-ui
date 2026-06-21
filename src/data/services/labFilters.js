/**
 * labFilters — the Lab screener's filter catalog and matching engine.
 *
 * Each variable you can screen on is ONE entry here. Add a field to a slate row
 * (labSlate.js) + a catalog entry and it becomes a stackable filter — no UI
 * changes needed. This is what makes the Lab dynamic: a day-trader-style
 * screener where you compose any set of conditions to surface hidden value.
 *
 * Filter definition:
 * {
 *   id, label, group,
 *   type: 'range' | 'select' | 'boolean',
 *   accessor: (row) => value,        // value to test (null = no data → fails)
 *   // range:
 *   min, max, step, unit, decimals, lowerLabel/upperLabel,
 *   // select:
 *   options: [{ value, label, test:(v)=>bool }],
 *   available: boolean,              // false → data not wired yet (inert)
 *   note: string,                    // shown when unavailable
 *   hint: string,                    // short helper under the control
 * }
 *
 * An ACTIVE filter is { id, ...config } where config is { gte, lte } for range,
 * { value } for select, { value } for boolean.
 */

export const GROUPS = ['Odds', 'Model', 'Pitcher', 'Team', 'Opponent'];

const SIDE_OPTS = [
  { value: 'fav', label: 'Favorite',  test: v => v === true },
  { value: 'dog', label: 'Underdog',  test: v => v === false },
];

const HAND_OPTS = [
  { value: 'R', label: 'Right-handed', test: v => v === 'R' || v === 'Right' },
  { value: 'L', label: 'Left-handed',  test: v => v === 'L' || v === 'Left' },
];

export const FILTER_CATALOG = [
  // ── Odds ──────────────────────────────────────────────────────────────────
  { id: 'marketSide', label: 'Market side', group: 'Odds', type: 'select',
    accessor: r => r.isFavorite, options: SIDE_OPTS, available: true,
    hint: 'Is the pitcher\'s team the favorite or the dog?' },
  { id: 'favStrength', label: 'Favorite line (abs)', group: 'Odds', type: 'range',
    accessor: r => r.favStrength, min: 100, max: 350, step: 5, unit: '', available: true,
    hint: 'Only matches favorites; e.g. 120–200 = moderate chalk.' },
  { id: 'dogStrength', label: 'Underdog line (+)', group: 'Odds', type: 'range',
    accessor: r => r.dogStrength, min: 100, max: 400, step: 5, unit: '', available: true,
    hint: 'Only matches underdogs.' },
  { id: 'totalLine', label: 'Total (O/U line)', group: 'Odds', type: 'range',
    accessor: r => r.totalLine, min: 6, max: 13, step: 0.5, decimals: 1, available: true },

  // ── Model ─────────────────────────────────────────────────────────────────
  { id: 'winProb', label: 'Model win prob', group: 'Model', type: 'range',
    accessor: r => r.winProb, min: 0, max: 100, step: 1, unit: '%', available: true },
  { id: 'modelEdge', label: 'Model edge vs market', group: 'Model', type: 'range',
    accessor: r => r.modelEdge, min: -20, max: 30, step: 0.5, unit: '%', decimals: 1, available: true,
    hint: 'Model win% minus market-implied %. Positive = value.' },
  { id: 'predMargin', label: 'Predicted margin', group: 'Model', type: 'range',
    accessor: r => r.predMargin, min: -5, max: 5, step: 0.1, decimals: 1, available: true,
    hint: 'Run margin from this team\'s perspective.' },
  { id: 'predTotal', label: 'Predicted total', group: 'Model', type: 'range',
    accessor: r => r.predTotal, min: 5, max: 14, step: 0.1, decimals: 1, available: true },

  // ── Pitcher (today's projection) ────────────────────────────────────────────
  { id: 'projK', label: 'Projected strikeouts', group: 'Pitcher', type: 'range',
    accessor: r => r.projK, min: 0, max: 12, step: 0.5, decimals: 1, available: true },
  { id: 'projOuts', label: 'Projected outs', group: 'Pitcher', type: 'range',
    accessor: r => r.projOuts, min: 0, max: 27, step: 1, available: true },
  { id: 'projER', label: 'Projected earned runs', group: 'Pitcher', type: 'range',
    accessor: r => r.projER, min: 0, max: 8, step: 0.5, decimals: 1, available: true },
  { id: 'projHits', label: 'Projected hits allowed', group: 'Pitcher', type: 'range',
    accessor: r => r.projHits, min: 0, max: 12, step: 0.5, decimals: 1, available: true },
  { id: 'pitcherAge', label: 'Pitcher age', group: 'Pitcher', type: 'range',
    accessor: r => r.pitcherAge, min: 18, max: 45, step: 1, unit: ' yrs', available: true,
    hint: 'From the player-profile info (current age).' },
  { id: 'pitcherHand', label: 'Throwing hand', group: 'Pitcher', type: 'select',
    accessor: r => r.pitcherHand, options: HAND_OPTS, available: true,
    hint: 'L/R from the player-profile info.' },
  { id: 'daysRest', label: 'Days of rest', group: 'Pitcher', type: 'range',
    accessor: r => r.daysRest, min: 0, max: 7, step: 1, unit: ' d', available: true,
    hint: 'Computed from the last start in the pitcher\'s game logs.' },
  // backend-pending
  { id: 'pitcherSeasonEra', label: 'Season ERA', group: 'Pitcher', type: 'range',
    accessor: r => r.pitcherSeasonEra, min: 0, max: 8, step: 0.1, decimals: 2, available: false,
    note: 'Needs `season_era` on the pitcher payload.' },

  // ── Team form ───────────────────────────────────────────────────────────────
  { id: 'teamWinPct', label: 'Team win %', group: 'Team', type: 'range',
    accessor: r => r.teamWinPct, min: 0.3, max: 0.7, step: 0.005, decimals: 3, available: true },
  { id: 'teamLast10W', label: 'Team last-10 wins', group: 'Team', type: 'range',
    accessor: r => r.teamLast10W, min: 0, max: 10, step: 1, available: true,
    hint: 'Recent form: 0–10 wins in last 10 games.' },
  { id: 'teamStreak', label: 'Team streak (W+/L−)', group: 'Team', type: 'range',
    accessor: r => r.teamStreak, min: -10, max: 10, step: 1, available: true },
  { id: 'teamRunDiff', label: 'Team run differential', group: 'Team', type: 'range',
    accessor: r => r.teamRunDiff, min: -150, max: 150, step: 5, available: true },

  // ── Opponent form ─────────────────────────────────────────────────────────
  { id: 'oppWinPct', label: 'Opponent win %', group: 'Opponent', type: 'range',
    accessor: r => r.oppWinPct, min: 0.3, max: 0.7, step: 0.005, decimals: 3, available: true,
    hint: '"Relatively competitive" ≈ .470–.560.' },
  { id: 'oppLast10W', label: 'Opponent last-10 wins', group: 'Opponent', type: 'range',
    accessor: r => r.oppLast10W, min: 0, max: 10, step: 1, available: true },
  { id: 'oppStreak', label: 'Opponent streak (W+/L−)', group: 'Opponent', type: 'range',
    accessor: r => r.oppStreak, min: -10, max: 10, step: 1, available: true },
  { id: 'oppRunDiff', label: 'Opponent run differential', group: 'Opponent', type: 'range',
    accessor: r => r.oppRunDiff, min: -150, max: 150, step: 5, available: true },
  // backend-pending
  { id: 'oppRispAvg', label: 'Opp AVG w/ RISP', group: 'Opponent', type: 'range',
    accessor: r => r.oppRispAvg, min: 0.1, max: 0.35, step: 0.005, decimals: 3, available: false,
    note: 'Needs situational splits (RISP) per team.' },
];

export const CATALOG_BY_ID = Object.fromEntries(FILTER_CATALOG.map(f => [f.id, f]));

// ── matching engine ───────────────────────────────────────────────────────────

function passesOne(row, active) {
  const def = CATALOG_BY_ID[active.id];
  if (!def) return true;
  const v = def.accessor(row);
  if (v == null) return false; // no data for this attribute on this row → excluded

  if (def.type === 'range') {
    if (active.gte != null && v < active.gte) return false;
    if (active.lte != null && v > active.lte) return false;
    return true;
  }
  if (def.type === 'boolean') return active.value == null ? true : v === active.value;
  if (def.type === 'select') {
    if (active.value == null) return true;
    const opt = def.options.find(o => o.value === active.value);
    return opt ? opt.test(v) : true;
  }
  return true;
}

/** Rows passing ALL active filters. */
export function applyFilters(rows, activeFilters) {
  if (!activeFilters?.length) return rows;
  return rows.filter(row => activeFilters.every(a => passesOne(row, a)));
}

/** Default config when a filter is first added (sensible starting bounds). */
export function defaultConfig(def) {
  if (def.type === 'range') return { gte: def.min, lte: def.max };
  return { value: null };
}

// ── starter templates (preset filter stacks) ──────────────────────────────────
// Available filters are active; backend-pending ones are included so they engage
// the moment the data is wired.
export const TEMPLATES = [
  {
    id: 'vet-chalk-vs-competitive',
    name: 'Vet favorite vs. competitive foe',
    desc: 'Older starter, short rest, moderate favorite, facing a near-.500 team.',
    filters: [
      { id: 'pitcherAge', gte: 30, lte: 45 },
      { id: 'daysRest', gte: 0, lte: 4 },
      { id: 'marketSide', value: 'fav' },
      { id: 'favStrength', gte: 110, lte: 200 },
      { id: 'oppWinPct', gte: 0.47, lte: 0.56 },
    ],
  },
  {
    id: 'model-edge-dogs',
    name: 'Model-edge underdogs',
    desc: 'Underdogs the model rates well above the market.',
    filters: [
      { id: 'marketSide', value: 'dog' },
      { id: 'modelEdge', gte: 5, lte: 30 },
    ],
  },
  {
    id: 'cold-opponent',
    name: 'Cold opponent spots',
    desc: 'Facing a team in a losing streak / poor last-10.',
    filters: [
      { id: 'oppStreak', gte: -10, lte: -2 },
      { id: 'oppLast10W', gte: 0, lte: 3 },
    ],
  },
];
