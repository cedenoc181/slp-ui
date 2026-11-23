// Caribbean winter leagues (CBPC). Kept apart from apiConstants on purpose:
// CBPC team_id / player_id are their own id space and must never be passed to
// MLB helpers (getTeamById, TEAMS, mlbstatic URL builders).

// Display metadata per league slug. The list of leagues, their seasons and
// current_season come from GET /cbpc/leagues; this only adds labels. `code`
// is the API's league code (competitions[].leagues, game.league); `fullName`
// is the official name, shown in the league tabs' hover tooltip.
export const CBPC_LEAGUES = {
  lidom: { code: 'LIDOM', short: 'LIDOM', name: 'LIDOM',                      country: 'Dominican Republic',
           fullName: 'Liga de Béisbol Profesional de la República Dominicana' },
  lvbp:  { code: 'LVBP',  short: 'LVBP',  name: 'LVBP',                       country: 'Venezuela',
           fullName: 'Liga Venezolana de Béisbol Profesional' },
  lmp:   { code: 'LMP',   short: 'LMP',   name: 'Liga Mexicana del Pacífico', country: 'Mexico',
           fullName: 'Liga Mexicana del Pacífico' },
  lbprc: { code: 'LBPRC', short: 'LBPRC', name: 'Liga Roberto Clemente',      country: 'Puerto Rico',
           fullName: 'Liga de Béisbol Profesional Roberto Clemente' },
  cs:    { code: 'CS',    short: 'Serie del Caribe', name: 'Serie del Caribe', country: 'Caribbean Series', isNations: true,
           fullName: 'Serie del Caribe' },
};

// Tooltip text for a winter league tab: official name · country.
export const leagueTip = (slug) => {
  const l = CBPC_LEAGUES[slug];
  return l.isNations ? 'Serie del Caribe · Caribbean Series of national teams, each February' : `${l.fullName} · ${l.country}`;
};

export const CBPC_SLUGS = ['lidom', 'lvbp', 'lmp', 'lbprc', 'cs'];

export const DEFAULT_LEAGUE = 'lidom';

export const isNationsLeague = (slug) => !!CBPC_LEAGUES[slug]?.isNations;

// The winter league a viewer last picked on a league-scoped board (Trust
// Ledger page and Terminal card), so both open on the same league.
const WINTER_LEAGUE_KEY = 'sp-winter-league';

export function rememberedWinterLeague() {
  try {
    const saved = localStorage.getItem(WINTER_LEAGUE_KEY);
    return CBPC_SLUGS.includes(saved) ? saved : DEFAULT_LEAGUE;
  } catch {
    return DEFAULT_LEAGUE;
  }
}

export function rememberWinterLeague(slug) {
  try { localStorage.setItem(WINTER_LEAGUE_KEY, slug); } catch {}
}

// Season = the year the winter starts: 2025 → "2025-26".
export function seasonLabel(season) {
  const y = Number(season);
  if (!y) return '';
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

// game_type detail (Caribbean Series games are all R; use series_description there).
export const GAME_TYPE_LABELS = {
  R: 'Regular Season',
  F: 'Wild Card',
  D: 'First Round',
  L: 'Semifinal / Round Robin',
  W: 'Final',
};

// Leagues play October–January and the Caribbean Series is in February, so
// March–September is the off-season for every league.
export function isWinterOffseason(date = new Date()) {
  const m = date.getMonth() + 1;
  return m >= 3 && m <= 9;
}

// ── Routes ──────────────────────────────────────────────────────────────────
export const WINTER_ROOT = '/winter';

const withSeason = (path, season) => (season ? `${path}?season=${season}` : path);

export const winterPaths = {
  league: (league, season) => withSeason(`${WINTER_ROOT}/${league}`, season),
  game:   (league, gamePk, season) => withSeason(`${WINTER_ROOT}/${league}/games/${gamePk}`, season),
  team:   (league, teamId, season) => withSeason(`${WINTER_ROOT}/${league}/teams/${teamId}`, season),
  player: (league, playerId, season) => withSeason(`${WINTER_ROOT}/${league}/players/${playerId}`, season),
};
