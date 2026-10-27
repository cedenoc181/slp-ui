import { useEffect, useMemo, useRef, useState } from 'react';
import articlesData from '../../../data/contentData/article.json';
import moreArticlesData from '../../../data/contentData/moreArticles.json';
import { TEAMS, getTeamById } from '../../../data/constants/apiConstants';
import { SHOW_ANALYTICS_LAB } from '../../../data/constants/featureFlags';
import playerStatsService from '../../../data/services/playerStatsServices';
import scheduleService from '../../../data/services/scheduleService';
import iconMlbSchedule from '../../../assets/icons/mlb-schedule.png';
import iconMlbStandings from '../../../assets/icons/mlb-standings.png';
import iconTeamAnalytics from '../../../assets/icons/team-analytics.png';
import iconPlayerAnalytics from '../../../assets/icons/player-analytics.png';
import iconGameProp from '../../../assets/icons/game-prop.png';
import iconPitcherProp from '../../../assets/icons/pitcher-prop.png';
import iconBatterProp from '../../../assets/icons/batter-prop.png';
import iconSandlotInsider from '../../../assets/icons/sandlot-insider.png';
import iconStrategyBlog from '../../../assets/icons/strategy-blog.png';
import iconDataScience from '../../../assets/icons/data-science-and-baseball.png';
import iconHowToUse from '../../../assets/icons/how-to-use.png';
import iconGlossary from '../../../assets/icons/glossary.png';
import iconFaq from '../../../assets/icons/faq.png';
import iconResponsibleGaming from '../../../assets/icons/responsible-gaming.png';
import iconPlayerProfile from '../../../assets/icons/player-profile.png';

/*
  Site search for the Terminal's Cmd+K bar — the same search the old marketing
  header had: players (API, debounced), today's matchups, per-team prediction
  and analytics shortcuts, pages by keyword, and Insider article tags. Results
  are plain { to, state } destinations; the palette does the navigating, so
  every result opens inside the Terminal frame.
*/

const MAX_RESULTS = 8;
const PLAYER_DEBOUNCE_MS = 300;

const PAGE_OPTIONS = [
  { label: 'MLB Schedule', path: '/mlb-schedule', iconSrc: iconMlbSchedule, keywords: ['schedule', 'games', 'today', 'matchup', 'daily', 'analysis', 'overviews'] },
  { label: 'MLB Standings', path: '/mlb-standings', iconSrc: iconMlbStandings, keywords: ['standings', 'rankings', 'division', 'wild card', 'leaderboard'] },
  { label: 'Team Analytics', path: '/team-analytics', iconSrc: iconTeamAnalytics, keywords: ['team', 'analytics', 'stats', 'statistics'] },
  { label: 'Player Analytics', path: '/player-analytics', iconSrc: iconPlayerAnalytics, keywords: ['player', 'batter', 'pitcher', 'stats', 'analytics'] },
  ...(SHOW_ANALYTICS_LAB ? [{ label: 'Analytics Lab', path: '/analytics-explorer', iconSrc: iconTeamAnalytics, keywords: ['chart', 'explorer', 'analytics', 'lab', 'scatter', 'bar', 'line', 'custom', 'sql', 'query', 'builder', 'visualize'] }] : []),
  { label: 'Game Predictions', path: '/predictions/games', iconSrc: iconGameProp, keywords: ['predictions', 'picks', 'moneyline', 'spread', 'totals', 'game props'] },
  { label: 'Pitcher Props', path: '/predictions/pitchers', iconSrc: iconPitcherProp, keywords: ['pitcher props', 'strikeouts', 'props', 'innings'] },
  { label: 'Batter Props', path: '/predictions/batters', iconSrc: iconBatterProp, keywords: ['batter props', 'hits', 'home runs', 'props', 'total bases'] },
  { label: 'Sandlot Insider', path: '/sandlot-insider', iconSrc: iconSandlotInsider, keywords: ['articles', 'news', 'insider', 'analysis', 'commentary'] },
  { label: 'Strategy Blog', path: '/blogs', iconSrc: iconStrategyBlog, keywords: ['blog', 'strategy', 'tips', 'betting', 'advice'] },
  { label: 'Data Science & Baseball', path: '/data-science', iconSrc: iconDataScience, keywords: ['data', 'science', 'ml', 'machine learning', 'models', 'algorithm'] },
  { label: 'How to Use', path: '/how-to-use', iconSrc: iconHowToUse, keywords: ['how', 'guide', 'tutorial', 'help', 'instructions'] },
  { label: 'Glossary', path: '/glossary', iconSrc: iconGlossary, keywords: ['glossary', 'terms', 'definitions', 'dictionary', 'meaning'] },
  { label: 'FAQs', path: '/faqs', iconSrc: iconFaq, keywords: ['faq', 'questions', 'help', 'support'] },
  { label: 'Responsible Gaming', path: '/responsible-gaming', iconSrc: iconResponsibleGaming, keywords: ['responsible', 'gaming', 'safety', 'limits'] },
];

const ARTICLE_TAGS = Array.from(new Set(
  [...(articlesData?.articles || []), ...(moreArticlesData?.articles || [])].flatMap(a => a.tags || [])
));

function playerHeadshotUrl(mlbId) {
  if (!mlbId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${mlbId}/headshot/67/current`;
}

function matchupTimeLabel(game) {
  const statusLower = (game.status || '').toLowerCase();
  if (statusLower === 'final' || statusLower === 'game over' || statusLower === 'completed') return 'Today · Final';
  if (statusLower.includes('progress') || statusLower === 'live') return 'Today · Live';
  return `Today${game.game_time ? ` · ${game.game_time}` : ''}`;
}

/**
 * Same input sanitizing the header search used: cap length, strip control
 * chars, and whitelist letters/digits/space/-'.() plus Latin-extended
 * characters for international player names.
 */
export function sanitizeSearch(raw) {
  return String(raw || '')
    .slice(0, 60)
    .replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex
    .replace(/[^a-zA-Z0-9\s\-'.()À-ɏ]/g, '');
}

function localResults(trimmed, rawGames) {
  const yearMatch = trimmed.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : null;
  const normalized = trimmed.replace(/\b20\d{2}\b/, '').trim().toLowerCase();
  const isLikelyMlbId = /^\d{5,7}$/.test(trimmed);
  const results = [];

  // Teams → today's matchups, then prediction + analytics shortcuts for the top match.
  if (normalized.length >= 2 && !isLikelyMlbId) {
    const teamMatches = TEAMS.filter(team => {
      const terms = [team.name.toLowerCase(), team.id.toLowerCase(), team.urlName.replace(/-/g, ' ')];
      return terms.some(t => t.includes(normalized))
        || normalized.split(/\s+/).every(word => terms.some(t => t.includes(word)));
    });

    const matchedIds = new Set(teamMatches.map(t => t.teamId));
    (rawGames || [])
      .filter(g => matchedIds.has(g.away_team_id) || matchedIds.has(g.home_team_id))
      .slice(0, 2)
      .forEach(g => {
        const id = g.id ?? g.game_pk;
        results.push({
          key: `matchup-${id}`,
          type: 'matchup',
          iconSrc: iconMlbSchedule,
          label: `${getTeamById(g.away_team_id)?.id || g.away_team_name || 'Away'} vs ${getTeamById(g.home_team_id)?.id || g.home_team_name || 'Home'}`,
          sublabel: matchupTimeLabel(g),
          to: `/mlb-schedule/${id}`,
          state: { game: g },
        });
      });

    teamMatches.slice(0, 1).forEach(team => {
      const t = encodeURIComponent(team.id);
      results.push(
        { key: `pred-games-${team.id}`, type: 'prediction', iconSrc: iconGameProp, label: `${team.name} Game Predictions`, sublabel: 'Win/loss · Spread · Totals', to: `/predictions/games?team=${t}` },
        { key: `pred-batters-${team.id}`, type: 'prediction', iconSrc: iconBatterProp, label: `${team.name} Batter Props`, sublabel: 'Hits · HRs · RBIs · Total Bases', to: `/predictions/batters?team=${t}` },
        { key: `pred-pitchers-${team.id}`, type: 'prediction', iconSrc: iconPitcherProp, label: `${team.name} Pitcher Props`, sublabel: 'Strikeouts · Innings · ERA', to: `/predictions/pitchers?team=${t}` },
        { key: `team-${team.id}`, type: 'team', iconSrc: iconTeamAnalytics, label: `${team.name} Analytics${year ? ` (${year})` : ''}`, to: `/team-analytics/${team.urlName}${year ? `?season=${year}` : ''}` },
        { key: `roster-${team.id}`, type: 'players', iconSrc: iconPlayerAnalytics, label: `${team.name} Players${year ? ` (${year})` : ''}`, to: `/player-analytics?team=${team.id}${year ? `&season=${year}` : ''}` },
      );
    });
  }

  // Pages by keyword.
  if (normalized) {
    PAGE_OPTIONS
      .filter(p => p.label.toLowerCase().includes(normalized)
        || p.keywords.some(kw => kw.includes(normalized) || normalized.includes(kw)))
      .slice(0, 2)
      .forEach(p => {
        if (results.some(r => r.label.includes(p.label))) return;
        results.push({ key: `page-${p.path}`, type: 'page', iconSrc: p.iconSrc, label: p.label, to: p.path });
      });

    // Insider articles by tag.
    const tokens = normalized.split(/\s+/).filter(Boolean);
    ARTICLE_TAGS
      .filter(tag => {
        const lower = tag.toLowerCase();
        return lower.includes(normalized) || tokens.some(tok => lower.includes(tok) || tok.includes(lower));
      })
      .slice(0, 2)
      .forEach(tag => {
        results.push({ key: `tag-${tag}`, type: 'article', iconSrc: iconSandlotInsider, label: `Sandlot Insider: ${tag}`, to: `/sandlot-insider?tag=${encodeURIComponent(tag)}` });
      });
  }

  return { results, wantsPlayers: normalized.length >= 2 || isLikelyMlbId };
}

/**
 * @param {string} query — already sanitized
 * @returns {{ results: Array, searchingPlayers: boolean }}
 */
export function useSiteSearch(query) {
  const trimmed = query.trim();
  const [rawGames, setRawGames] = useState(null);
  const [players, setPlayers] = useState({ q: '', list: [] });
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const loadedGamesRef = useRef(false);

  // Today's raw schedule (for matchup results), fetched once on first search.
  // No games today → the next upcoming games instead.
  useEffect(() => {
    if (!trimmed || loadedGamesRef.current) return;
    loadedGamesRef.current = true;
    scheduleService.getTodayGames()
      .then(async data => {
        const today = Array.isArray(data) ? data : [];
        if (today.length) return today;
        const upcoming = await scheduleService.getUpcomingGames({ limit: 30 });
        return Array.isArray(upcoming) ? upcoming.slice(0, 30) : [];
      })
      .then(setRawGames)
      .catch(() => { loadedGamesRef.current = false; }); // retry on the next keystroke
  }, [trimmed]);

  const local = useMemo(() => (trimmed ? localResults(trimmed, rawGames) : { results: [], wantsPlayers: false }), [trimmed, rawGames]);

  // Players come from the API, debounced; stale responses are dropped.
  useEffect(() => {
    if (!local.wantsPlayers) { setSearchingPlayers(false); return; }
    let alive = true;
    setSearchingPlayers(true);
    const t = setTimeout(() => {
      playerStatsService.searchPlayers(trimmed, 5)
        .then(list => { if (alive) setPlayers({ q: trimmed, list: Array.isArray(list) ? list : [] }); })
        .catch(() => { if (alive) setPlayers({ q: trimmed, list: [] }); })
        .finally(() => { if (alive) setSearchingPlayers(false); });
    }, PLAYER_DEBOUNCE_MS);
    return () => { alive = false; clearTimeout(t); };
  }, [trimmed, local.wantsPlayers]);

  const results = useMemo(() => {
    if (!trimmed) return [];
    const playerResults = players.q === trimmed ? players.list.map(p => {
      // Lookup and search endpoints return slightly different shapes.
      const mlbId = p.mlb_id || p.player_mlb_id;
      const slug = p.name_slug || String(mlbId);
      return {
        key: `player-${p.id || p.player_id || slug}`,
        type: 'player',
        iconSrc: iconPlayerProfile,
        headshotUrl: playerHeadshotUrl(mlbId),
        label: p.full_name || p.player_name || 'Unknown Player',
        sublabel: p.team_name || p.current_team?.team_name || '',
        to: `/player/${slug}`,
      };
    }) : [];
    // Players first, then matchups, then everything else — same order as before.
    const matchups = local.results.filter(r => r.type === 'matchup');
    const rest = local.results.filter(r => r.type !== 'matchup');
    return [...playerResults, ...matchups, ...rest].slice(0, MAX_RESULTS);
  }, [trimmed, players, local]);

  return { results, searchingPlayers };
}
