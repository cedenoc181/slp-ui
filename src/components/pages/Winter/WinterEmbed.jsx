import { useMemo, useState } from 'react';
import cbpcService from '../../../data/services/cbpcService';
import { CBPC_LEAGUES, CBPC_SLUGS, DEFAULT_LEAGUE, leagueTip, seasonLabel } from '../../../data/constants/cbpcConstants';
import { useCbpc, Loading, ErrorState } from './winterUi';
import '../../../styles/league-tabs.css';
import '../../../styles/winter-page-styling/winter.css';

/*
  Winter-league views inside the MLB stats pages (Schedule, Standings, Team
  and Player Analytics). The "Serie del Caribe" league tab there is the
  umbrella for every winter league; this adds the winter league switcher
  (LIDOM / LVBP / LMP / LBPRC / Serie del Caribe) and season picker, and the
  wb- styles without the full /winter page frame.
*/

// League + season state for an embedded winter view. Season defaults to the
// league's current_season and resets when the league changes.
export function useWinterSelection(initialLeague = DEFAULT_LEAGUE) {
  const leaguesState = useCbpc(() => cbpcService.getLeagues(), []);
  const [league, setLeagueRaw] = useState(initialLeague);
  const [seasonChoice, setSeasonChoice] = useState(null);

  const leagueInfo = useMemo(
    () => leaguesState.data?.find(l => l.slug === league) ?? null,
    [leaguesState.data, league],
  );
  const season = leagueInfo
    ? (leagueInfo.seasons.includes(seasonChoice) ? seasonChoice : leagueInfo.current_season)
    : null;

  return {
    loading: leaguesState.loading,
    error: leaguesState.error,
    league,
    leagueInfo,
    season,
    isCurrentSeason: !!leagueInfo && season === leagueInfo.current_season,
    setLeague: (slug) => { setLeagueRaw(slug); setSeasonChoice(null); },
    setSeason: (s) => setSeasonChoice(Number(s)),
  };
}

export function WinterPicker({ sel, children }) {
  return (
    <div className="wb-embed-bar">
      <nav className="league-tabs" aria-label="Winter league">
        {CBPC_SLUGS.map(slug => (
          <button
            key={slug}
            type="button"
            className={`league-tab${sel.league === slug ? ' active' : ''}`}
            aria-pressed={sel.league === slug}
            data-tip={leagueTip(slug)}
            aria-label={`${CBPC_LEAGUES[slug].short}: ${leagueTip(slug)}`}
            onClick={() => sel.setLeague(slug)}
          >
            {CBPC_LEAGUES[slug].short}
          </button>
        ))}
      </nav>
      {sel.leagueInfo && (
        <select className="wb-season-select" aria-label="Season" value={sel.season} onChange={(e) => sel.setSeason(e.target.value)}>
          {[...sel.leagueInfo.seasons].reverse().map(s => <option key={s} value={s}>{seasonLabel(s)}</option>)}
        </select>
      )}
      {children}
    </div>
  );
}

// Wraps embedded content in the winter styles; renders children only once
// /cbpc/leagues has resolved the league's seasons.
export function WinterEmbed({ sel, children }) {
  return (
    <div className="wb-page wb-embed">
      {sel.loading ? <Loading rows={4} /> : sel.error || !sel.leagueInfo ? <ErrorState error={sel.error} /> : children}
    </div>
  );
}
