import { getTeamById } from '../../../../../data/constants/apiConstants';

// ─── URL helpers ─────────────────────────────────────────────────────────────

export function logoUrl(mlbId) {
  return `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
}

export function headshotUrl(playerMlbId) {
  if (!playerMlbId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_100/v1/people/${playerMlbId}/headshot/67/current`;
}

// ─── Team lookup helpers ──────────────────────────────────────────────────────

export function getMlbId(teamId) {
  return getTeamById(teamId)?.mlbId || null;
}

export function getAbbr(teamId) {
  return getTeamById(teamId)?.id || null;
}

export function getUrlName(teamId) {
  return getTeamById(teamId)?.urlName || null;
}

// ─── Season / status helpers ──────────────────────────────────────────────────

export function mapSeasonType(gameSeasonType) {
  if (gameSeasonType === 'spring') return 'S';
  if (gameSeasonType === 'postseason') return 'P';
  return 'R';
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────

export function hasValidStats(stats) {
  if (!stats) return false;
  if (Array.isArray(stats)) return stats.length > 0;
  return stats.era != null || stats.w != null || stats.wins != null || stats.ip != null;
}

export function fmt(val, decimals = 3) {
  if (val == null || val === '') return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return String(val);
  return num.toFixed(decimals);
}

export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// Baseball IP: store as decimal (e.g. 4.333…), display as 4.1 / 4.2
export function fmtIP(ipDecimal) {
  if (ipDecimal == null) return '—';
  const totalOuts = Math.round(ipDecimal * 3);
  return `${Math.floor(totalOuts / 3)}.${totalOuts % 3}`;
}

// ─── Data-processing helpers ──────────────────────────────────────────────────

// Aggregate per-game player arrays into one row per player
export function aggregatePlayers(games, side) {
  if (!Array.isArray(games)) return [];
  const map = new Map();
  for (const game of games) {
    const players = game[side];
    if (!Array.isArray(players)) continue;
    for (const p of players) {
      const key = p.player_mlb_id ?? p.player_name;
      if (key == null) continue;
      if (!map.has(key)) {
        map.set(key, { ...p, _g: 1 });
      } else {
        const acc = map.get(key);
        acc._g += 1;
        if (p.is_starter) acc.is_starter = true;
        for (const field of Object.keys(p)) {
          if (field === 'player_mlb_id' || field === 'player_name' || field === 'is_starter') continue;
          if (typeof p[field] === 'number') acc[field] = (acc[field] ?? 0) + p[field];
        }
      }
    }
  }
  return Array.from(map.values());
}

export function wasWin(game, teamId) {
  if (game.winning_team_id != null) return game.winning_team_id === teamId;
  if (game.result) return game.result === 'W';
  if (game.win != null) return Boolean(game.win);
  return null;
}

// The last10 endpoint returns [summaryObj, ...gameObjects]
// where summaryObj has last_ten_wins/losses/streak_code fields
export function parseLast10(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { summary: null, games: [] };
  const first = raw[0];
  if (first && first.last_ten_wins != null) {
    return { summary: first, games: raw.slice(1) };
  }
  return { summary: null, games: raw };
}

export function findTeamRecord(standings, teamId, isSpring) {
  if (!standings) return null;
  const teams = [];
  if (isSpring) {
    for (const leagueTeams of Object.values(standings)) {
      if (Array.isArray(leagueTeams)) teams.push(...leagueTeams);
    }
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return null;
    const w = team.spring_league_wins ?? null;
    const l = team.spring_league_losses ?? null;
    return w != null && l != null ? `${w}-${l}` : null;
  } else {
    const src = standings.divisions ?? standings.leagues ?? standings;
    const srcArr = Array.isArray(src) ? src : Object.values(src);
    for (const item of srcArr) {
      if (item?.teams) teams.push(...item.teams);
      else if (item?.team_id != null || item?.id != null) teams.push(item);
    }
    const team = teams.find(t => (t.team_id ?? t.id) === teamId);
    if (!team) return null;
    const w = team.wins ?? team.w ?? null;
    const l = team.losses ?? team.l ?? null;
    if (w != null && l != null) return `${w}-${l}`;
    return team.record ?? null;
  }
}

export function toNameSlug(name) {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formGames(games, teamId) {
  return games
    .filter(g =>
      g.id != null && (
        g.winning_team_id != null ||
        (g.status || '').toLowerCase().includes('final')
      )
    )
    .slice(0, 10)
    .map(g => {
      const isAway = g.away_team_id === teamId;
      const myRuns = isAway ? g.away_runs_score : g.home_runs_score;
      const oppRuns = isAway ? g.home_runs_score : g.away_runs_score;
      const oppTeamId = isAway ? g.home_team_id : g.away_team_id;
      const w = wasWin(g, teamId);
      return {
        result: w === true ? 'W' : w === false ? 'L' : 'T',
        myRuns,
        oppRuns,
        oppAbbr: getAbbr(oppTeamId) || '???',
        oppMlbId: getMlbId(oppTeamId),
        isHome: !isAway,
        gameId: g.id ?? g.game_pk,
        rawGame: g,
      };
    });
}
