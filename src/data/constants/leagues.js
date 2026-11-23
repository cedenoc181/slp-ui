import { TEAMS } from './apiConstants';

// Leagues offered in every league switcher (Terminal, Team/Player Analytics,
// Schedule, Standings, Trust Ledger, Predictions). MLB is the only league with
// data. 'soon' leagues are listed but can't be picked; 'preview' leagues can
// be picked and show each page's preview card. "Serie del Caribe" is the
// umbrella for every Caribbean winter league (LIDOM, LVBP, LMP, LBPRC and the
// Series itself). It stays 'soon' here, and the pages that show winter data
// (Schedule, Standings, Team/Player Analytics, and the Terminal's watchlist)
// enable it via WINTER_ENABLED.
// `tip` is the hover tooltip; 'soon' tabs append "coming soon" to it.
export const WINTER_ENABLED = ['sdc'];
export const LEAGUES = [
  { id: 'mlb',  label: 'MLB',              status: 'live', tip: 'Major League Baseball' },
  { id: 'sdc',  label: 'Serie del Caribe', status: 'soon', seasonLabel: '2026-27',
    tip: 'Caribbean winter leagues: LIDOM, LVBP, LMP, LBPRC and the Serie del Caribe' },
  { id: 'ncaa', label: 'NCAA',             status: 'soon', tip: 'NCAA Division I college baseball' },
  { id: 'kbo',  label: 'KBO',              status: 'soon', tip: 'Korea Baseball Organization' },
  { id: 'npb',  label: 'NPB',              status: 'soon', tip: 'Nippon Professional Baseball' },
];

export const leagueTabTip = (l, soon) => (soon ? `${l.tip} · coming soon` : l.tip);

export const getLeague = (id) => LEAGUES.find(l => l.id === id);

const MLB_DIVISIONS = [
  { key: 'al-east',    label: 'AL East' },
  { key: 'al-central', label: 'AL Central' },
  { key: 'al-west',    label: 'AL West' },
  { key: 'nl-east',    label: 'NL East' },
  { key: 'nl-central', label: 'NL Central' },
  { key: 'nl-west',    label: 'NL West' },
];

// MLB teams grouped by division for <optgroup> team dropdowns.
export const MLB_TEAM_GROUPS = MLB_DIVISIONS.map(d => ({
  ...d,
  teams: TEAMS.filter(t => t.division === d.key).sort((a, b) => a.name.localeCompare(b.name)),
}));
