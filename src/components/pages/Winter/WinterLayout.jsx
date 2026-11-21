import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useParams, useSearchParams } from 'react-router-dom';
import cbpcService from '../../../data/services/cbpcService';
import {
  CBPC_LEAGUES, CBPC_SLUGS, leagueTip, seasonLabel, winterPaths,
} from '../../../data/constants/cbpcConstants';
import { PlayerPhoto, TeamLogo, useCbpc, Loading, ErrorState } from './winterUi';
import '../../../styles/league-tabs.css';
import '../../../styles/winter-page-styling/winter.css';

/*
  Frame for every /winter/:league page: section title, league switcher and
  season picker (both driven by /cbpc/leagues), and a player search across all
  five leagues. Child pages get { league, leagueInfo, season, isCurrentSeason }
  through the outlet context.
*/

export function WinterSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);

  // One request per league, in parallel; a league that fails is just skipped.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      Promise.allSettled(CBPC_SLUGS.map(slug => cbpcService.searchPlayers(slug, term, 5)))
        .then(settled => {
          if (!alive) return;
          setResults(CBPC_SLUGS
            .map((slug, i) => ({ slug, players: settled[i].status === 'fulfilled' ? settled[i].value : [] }))
            .filter(g => g.players.length));
        });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="wb-search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <input
        type="search"
        className="wb-search-input"
        placeholder="Search winter-league players"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        aria-label="Search winter-league players"
      />
      {open && results && (
        <div className="wb-search-results" role="listbox">
          {results.length === 0 && <div className="wb-search-empty">No players found.</div>}
          {results.map(g => (
            <div key={g.slug} className="wb-search-group">
              <div className="wb-search-group-label">{CBPC_LEAGUES[g.slug].short}</div>
              {g.players.map(p => (
                <Link key={p.id} to={winterPaths.player(g.slug, p.id)} className="wb-search-item" onClick={() => { setOpen(false); setQ(''); }}>
                  <PlayerPhoto src={p.headshot_url} name={p.full_name} size={28} />
                  <span className="wb-search-name">{p.full_name}<span className="wb-faint"> · {p.position_abbreviation}</span></span>
                  <span className="wb-search-team">
                    {p.team_name
                      ? <><TeamLogo src={p.team_logo_url} abbr={p.team_abbreviation} name={p.team_name} size={18} />{p.team_name}</>
                      : <span className="wb-faint">Not on a roster this winter</span>}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WinterLayout() {
  const { league } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const leaguesState = useCbpc(() => cbpcService.getLeagues(), []);

  const leagueInfo = useMemo(
    () => leaguesState.data?.find(l => l.slug === league) ?? null,
    [leaguesState.data, league],
  );
  const seasonParam = Number(searchParams.get('season')) || null;
  const season = leagueInfo
    ? (leagueInfo.seasons.includes(seasonParam) ? seasonParam : leagueInfo.current_season)
    : null;

  const known = CBPC_SLUGS.includes(league);

  return (
    <div className="wb-page">
      <header className="wb-head">
        <div className="wb-wrap">
          <div className="wb-head-top">
            <div>
              <p className="wb-eyebrow">Winter Ball · Caribbean Winter Leagues</p>
              <h1 className="wb-title">{known ? CBPC_LEAGUES[league].name : 'Winter Ball'}</h1>
              {known && <p className="wb-sub">{CBPC_LEAGUES[league].country}{season ? ` · ${seasonLabel(season)}` : ''}</p>}
            </div>
            <WinterSearch />
          </div>
          <div className="wb-head-controls">
            <nav className="league-tabs" aria-label="Winter league">
              {CBPC_SLUGS.map(slug => (
                <NavLink key={slug} to={winterPaths.league(slug)} data-tip={leagueTip(slug)} aria-label={`${CBPC_LEAGUES[slug].short}: ${leagueTip(slug)}`} className={({ isActive }) => `league-tab${isActive ? ' active' : ''}`}>
                  {CBPC_LEAGUES[slug].short}
                </NavLink>
              ))}
            </nav>
            {leagueInfo && (
              <select
                className="wb-season-select"
                aria-label="Season"
                value={season}
                onChange={(e) => setSearchParams({ season: e.target.value })}
              >
                {[...leagueInfo.seasons].reverse().map(s => (
                  <option key={s} value={s}>{seasonLabel(s)}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="wb-wrap wb-main">
        {!known ? (
          <ErrorState error={{ status: 404 }} notFound="That isn't one of the winter leagues." />
        ) : leaguesState.loading ? (
          <Loading rows={4} />
        ) : leaguesState.error || !leagueInfo ? (
          <ErrorState error={leaguesState.error} />
        ) : (
          <Outlet context={{ league, leagueInfo, season, isCurrentSeason: season === leagueInfo.current_season }} />
        )}
      </main>
    </div>
  );
}
