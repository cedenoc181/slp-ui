// ========== SEASON TYPES ==========
// Numeric codes: 1 = Spring Training, 2 = Regular Season, 3 = Postseason
export const SEASON_TYPES = {
  REGULAR: 'R',
  POSTSEASON: 'P',
  SPRING_TRAINING: 'S',
};

// Numeric season type codes for APIs that require them
export const SEASON_TYPE_CODES = {
  SPRING_TRAINING: 1,
  REGULAR: 2,
  POSTSEASON: 3,
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
export const DEFAULT_SEASON = '2026';

export const SEASON_RANGE = {
  START: 2010,
  END: 2026,
};

// Last completed regular season — updated to current season on Opening Day.
export const ACTIVE_SEASON = '2026';

// Generate seasons array: ['2026', '2025', ... '2010']
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
  ATH: { name: 'Athletics',              city: 'Sacramento',    division: 'al-west',     urlName: 'athletics',                mlbId: 133 },
  PIT: { name: 'Pittsburgh Pirates',     city: 'Pittsburgh',    division: 'nl-central',  urlName: 'pittsburgh-pirates',       mlbId: 134 },
  SD:  { name: 'San Diego Padres',       city: 'San Diego',     division: 'nl-west',     urlName: 'san-diego-padres',         mlbId: 135 },
  SEA: { name: 'Seattle Mariners',       city: 'Seattle',       division: 'al-west',     urlName: 'seattle-mariners',         mlbId: 136 },
  SF:  { name: 'San Francisco Giants',   city: 'San Francisco', division: 'nl-west',     urlName: 'san-francisco-giants',     mlbId: 137 },
  STL: { name: 'St. Louis Cardinals',    city: 'St. Louis',     division: 'nl-central',  urlName: 'st-louis-cardinals',       mlbId: 138 },
  TB:  { name: 'Tampa Bay Rays',         city: 'Tampa Bay',     division: 'al-east',     urlName: 'tampa-bay-rays',           mlbId: 139 },
  TEX: { name: 'Texas Rangers',          city: 'Arlington',     division: 'al-west',     urlName: 'texas-rangers',            mlbId: 140 },
  TOR: { name: 'Toronto Blue Jays',      city: 'Toronto',       division: 'al-east',     urlName: 'toronto-blue-jays',        mlbId: 141 },
  MIN: { name: 'Minnesota Twins',        city: 'Minneapolis',   division: 'al-central',  urlName: 'minnesota-twins',          mlbId: 142 },
  PHI: { name: 'Philadelphia Phillies',  city: 'Philadelphia',  division: 'nl-east',     urlName: 'philadelphia-phillies',    mlbId: 143 },
  ATL: { name: 'Atlanta Braves',         city: 'Atlanta',       division: 'nl-east',     urlName: 'atlanta-braves',           mlbId: 144 },
  CWS: { name: 'Chicago White Sox',      city: 'Chicago',       division: 'al-central',  urlName: 'chicago-white-sox',        mlbId: 145 },
  MIA: { name: 'Miami Marlins',          city: 'Miami',         division: 'nl-east',     urlName: 'miami-marlins',            mlbId: 146 },
  NYY: { name: 'New York Yankees',       city: 'New York',      division: 'al-east',     urlName: 'new-york-yankees',         mlbId: 147 },
  MIL: { name: 'Milwaukee Brewers',      city: 'Milwaukee',     division: 'nl-central',  urlName: 'milwaukee-brewers',        mlbId: 158 },
  LAA: { name: 'Los Angeles Angels',     city: 'Anaheim',       division: 'al-west',     urlName: 'los-angeles-angels',       mlbId: 108 },
  AZ:  { name: 'Arizona Diamondbacks',   city: 'Phoenix',       division: 'nl-west',     urlName: 'arizona-diamondbacks',     mlbId: 109 },
  BAL: { name: 'Baltimore Orioles',      city: 'Baltimore',     division: 'al-east',     urlName: 'baltimore-orioles',        mlbId: 110 },
  BOS: { name: 'Boston Red Sox',         city: 'Boston',        division: 'al-east',     urlName: 'boston-red-sox',           mlbId: 111 },
  CHC: { name: 'Chicago Cubs',           city: 'Chicago',       division: 'nl-central',  urlName: 'chicago-cubs',             mlbId: 112 },
  CIN: { name: 'Cincinnati Reds',        city: 'Cincinnati',    division: 'nl-central',  urlName: 'cincinnati-reds',          mlbId: 113 },
  CLE: { name: 'Cleveland Guardians',    city: 'Cleveland',     division: 'al-central',  urlName: 'cleveland-guardians',      mlbId: 114 },
  COL: { name: 'Colorado Rockies',       city: 'Denver',        division: 'nl-west',     urlName: 'colorado-rockies',         mlbId: 115 },
  DET: { name: 'Detroit Tigers',         city: 'Detroit',       division: 'al-central',  urlName: 'detroit-tigers',           mlbId: 116 },
  HOU: { name: 'Houston Astros',         city: 'Houston',       division: 'al-west',     urlName: 'houston-astros',           mlbId: 117 },
  KC:  { name: 'Kansas City Royals',     city: 'Kansas City',   division: 'al-central',  urlName: 'kansas-city-royals',       mlbId: 118 },
  LAD: { name: 'Los Angeles Dodgers',    city: 'Los Angeles',   division: 'nl-west',     urlName: 'los-angeles-dodgers',      mlbId: 119 },
  WSH: { name: 'Washington Nationals',   city: 'Washington',    division: 'nl-east',     urlName: 'washington-nationals',     mlbId: 120 },
  NYM: { name: 'New York Mets',          city: 'New York',      division: 'nl-east',     urlName: 'new-york-mets',            mlbId: 121 },
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