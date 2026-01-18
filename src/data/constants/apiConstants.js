// ========== SEASON TYPES ==========
export const SEASON_TYPES = {
  REGULAR: 'R',
  POSTSEASON: 'P',
  SPRING_TRAINING: 'S',
};

// ========== PLAYER ROLES ==========
export const PLAYER_ROLES = {
  PITCHER: 'pitcher',
  BATTER: 'batters',
};

// ========== STAT CATEGORIES ==========
export const STAT_CATEGORIES = {
  BATTING: 'batting',
  PITCHING: 'pitching',
};

// ========== SEASONS ==========
export const DEFAULT_SEASON = '2025';

export const SEASON_RANGE = {
  START: 2010,
  END: 2025,
};

// Generate seasons array: ['2025', '2024', ... '2010']
export const SEASONS = Array.from(
  { length: SEASON_RANGE.END - SEASON_RANGE.START + 1 },
  (_, i) => String(SEASON_RANGE.END - i)
);

// ========== TEAM IDS ==========
export const TEAM_IDS = {
  ATH: 1,
  PIT: 2,
  SD: 3,
  SEA: 4,
  SF: 5,
  STL: 6,
  TB: 7,
  TEX: 8,
  TOR: 9,
  MIN: 10,
  PHI: 11,
  ATL: 12,
  CWS: 13,
  MIA: 14,
  NYY: 15,
  MIL: 16,
  LAA: 17,
  AZ: 18,
  BAL: 19,
  BOS: 20,
  CHC: 21,
  CIN: 22,
  CLE: 23,
  COL: 24,
  DET: 25,
  HOU: 26,
  KC: 27,
  LAD: 28,
  WSH: 29,
  NYM: 30,
};

// ========== TEAM METADATA ==========
export const TEAM_METADATA = {
  ATH: { name: 'Athletics', urlName: 'athletics', mlbId: 133 },
  PIT: { name: 'Pittsburgh Pirates', urlName: 'pittsburgh-pirates', mlbId: 134 },
  SD: { name: 'San Diego Padres', urlName: 'san-diego-padres', mlbId: 135 },
  SEA: { name: 'Seattle Mariners', urlName: 'seattle-mariners', mlbId: 136 },
  SF: { name: 'San Francisco Giants', urlName: 'san-francisco-giants', mlbId: 137 },
  STL: { name: 'St. Louis Cardinals', urlName: 'st-louis-cardinals', mlbId: 138 },
  TB: { name: 'Tampa Bay Rays', urlName: 'tampa-bay-rays', mlbId: 139 },
  TEX: { name: 'Texas Rangers', urlName: 'texas-rangers', mlbId: 140 },
  TOR: { name: 'Toronto Blue Jays', urlName: 'toronto-blue-jays', mlbId: 141 },
  MIN: { name: 'Minnesota Twins', urlName: 'minnesota-twins', mlbId: 142 },
  PHI: { name: 'Philadelphia Phillies', urlName: 'philadelphia-phillies', mlbId: 143 },
  ATL: { name: 'Atlanta Braves', urlName: 'atlanta-braves', mlbId: 144 },
  CWS: { name: 'Chicago White Sox', urlName: 'chicago-white-sox', mlbId: 145 },
  MIA: { name: 'Miami Marlins', urlName: 'miami-marlins', mlbId: 146 },
  NYY: { name: 'New York Yankees', urlName: 'new-york-yankees', mlbId: 147 },
  MIL: { name: 'Milwaukee Brewers', urlName: 'milwaukee-brewers', mlbId: 158 },
  LAA: { name: 'Los Angeles Angels', urlName: 'los-angeles-angels', mlbId: 108 },
  AZ: { name: 'Arizona Diamondbacks', urlName: 'arizona-diamondbacks', mlbId: 109 },
  BAL: { name: 'Baltimore Orioles', urlName: 'baltimore-orioles', mlbId: 110 },
  BOS: { name: 'Boston Red Sox', urlName: 'boston-red-sox', mlbId: 111 },
  CHC: { name: 'Chicago Cubs', urlName: 'chicago-cubs', mlbId: 112 },
  CIN: { name: 'Cincinnati Reds', urlName: 'cincinnati-reds', mlbId: 113 },
  CLE: { name: 'Cleveland Guardians', urlName: 'cleveland-guardians', mlbId: 114 },
  COL: { name: 'Colorado Rockies', urlName: 'colorado-rockies', mlbId: 115 },
  DET: { name: 'Detroit Tigers', urlName: 'detroit-tigers', mlbId: 116 },
  HOU: { name: 'Houston Astros', urlName: 'houston-astros', mlbId: 117 },
  KC: { name: 'Kansas City Royals', urlName: 'kansas-city-royals', mlbId: 118 },
  LAD: { name: 'Los Angeles Dodgers', urlName: 'los-angeles-dodgers', mlbId: 119 },
  WSH: { name: 'Washington Nationals', urlName: 'washington-nationals', mlbId: 120 },
  NYM: { name: 'New York Mets', urlName: 'new-york-mets', mlbId: 121 },
};

// ========== GENERATED TEAMS ARRAY ==========
// Combines TEAM_IDS with TEAM_METADATA automatically
export const TEAMS = Object.entries(TEAM_IDS).map(([abbr, teamId]) => ({
  id: abbr,
  teamId: teamId,
  ...TEAM_METADATA[abbr],
}));

// ========== UTILITY FUNCTIONS ==========
export const getTeamByAbbr = (abbr) => TEAMS.find(t => t.id === abbr);
export const getTeamByUrlName = (urlName) => TEAMS.find(t => t.urlName === urlName);
export const getTeamById = (teamId) => TEAMS.find(t => t.teamId === teamId);
export const getTeamIdFromAbbr = (abbr) => TEAM_IDS[abbr];