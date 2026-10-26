import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import teamsService from '../data/services/teamsService';
import '../styles/home-page-styling/hero.css';

// Watchlist panel shows real win% for a few well-known teams (not a saved,
// personalized list — that's a logged-in feature that doesn't exist yet).
const WATCHLIST_TEAMS = ['LAD', 'NYY', 'HOU'];

// Same sample picks shown in the Predictions Preview section below — kept in
// sync intentionally, not pulled from a live feed. Real picks stay behind
// that section's own lock, not the hero.
const SAMPLE_PICKS = [
  { player: 'F. Freeman', team: 'LAD', statAbbr: 'H', line: '1.5', confidence: 74 },
  { player: 'A. Judge', team: 'NYY', statAbbr: 'TB', line: '1.5', confidence: 71 },
];

// Trust Ledger is premium-gated server-side (403 for anonymous visitors), so
// this is a labeled preview, not a live fetch — same honesty pattern as the
// "sample picks" tag below.
const TRUST_LEDGER_PREVIEW = [
  { rank: 1, team: 'LAD', score: 92 },
  { rank: 2, team: 'HOU', score: 88 },
  { rank: 3, team: 'ATL', score: 85 },
];

function Hero() {
  const navigate = useNavigate();
  const [standingsByAbbr, setStandingsByAbbr] = useState(null);
  const [alEast, setAlEast] = useState(null);

  useEffect(() => {
    let alive = true;
    teamsService.getTeamRegularSeasonStandings()
      .then(data => {
        if (!alive || !data) return;
        const byAbbr = {};
        Object.values(data).flat().forEach(t => { byAbbr[t.team_abbreviation] = t; });
        setStandingsByAbbr(byAbbr);
        const east = Array.isArray(data['AL East']) ? data['AL East'] : [];
        setAlEast([...east].sort((a, b) => a.division_rank - b.division_rank).slice(0, 3));
      })
      .catch(() => {
        if (!alive) return;
        setStandingsByAbbr({});
        setAlEast([]);
      });
    return () => { alive = false; };
  }, []);

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-eyebrow">{'// BASEBALL ANALYTICS, MODELS & MORE'}</p>
          <h1 className="hero-title">
            Smarter picks start <em>here.</em>
          </h1>
          <p className="hero-lede">
            Advanced player predictions, real-time statistics, and data-driven insights
            to help you make smarter decisions.
          </p>
          <div className="hero-cta-group">
            <button className="hero-cta-primary" onClick={() => navigate('/account')}>
              <span>Start Free</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <a href="#predictions" className="hero-cta-secondary">See What&apos;s Inside</a>
          </div>
          <p className="hero-trust-line">
            Free to browse standings &amp; stats · <span className="mono">Premium</span> unlocks full access
          </p>
        </div>

        <div className="hero-preview-frame">
          <div className="hpf-bar">
            <span className="hpf-dot"></span><span className="hpf-dot"></span><span className="hpf-dot"></span>
            <span className="hpf-url">sandlotpicks.com</span>
          </div>
          <div className="hpf-body">
            <div className="hpf-panel">
              <div className="hpf-panel-title"><span className="hpf-panel-dot"></span>Watchlist</div>
              {WATCHLIST_TEAMS.map(abbr => {
                const t = standingsByAbbr?.[abbr];
                return (
                  <div className="hpf-row" key={abbr}>
                    <span>{abbr}</span>
                    {t ? (
                      <span className={`mono ${t.w_l_pct >= 0.5 ? 'pos' : 'neg'}`}>
                        {t.w_l_pct.toFixed(3).replace(/^0/, '')}
                      </span>
                    ) : (
                      <span className="mono hpf-dim">—</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hpf-panel">
              <div className="hpf-panel-title"><span className="hpf-panel-dot"></span>AL East Standings</div>
              {alEast === null && <div className="hpf-row hpf-skeleton" aria-hidden="true" />}
              {alEast && alEast.length === 0 && (
                <div className="hpf-row hpf-empty">Unavailable right now</div>
              )}
              {alEast && alEast.map(t => (
                <div className="hpf-row" key={t.team_abbreviation}>
                  <span>{t.team_abbreviation}</span>
                  <span className="mono">{t.wins}-{t.losses}</span>
                </div>
              ))}
            </div>

            <div className="hpf-panel">
              <div className="hpf-panel-title"><span className="hpf-panel-dot"></span>Trust Ledger <em>preview</em></div>
              {TRUST_LEDGER_PREVIEW.map(r => (
                <div className="hpf-row" key={r.team}>
                  <span>{r.rank}&nbsp;&nbsp;{r.team}</span>
                  <span className="mono">{r.score}</span>
                </div>
              ))}
            </div>

            <div className="hpf-panel hpf-wide hpf-locked">
              <div className="hpf-panel-title"><span className="hpf-panel-dot"></span>Predictions Preview <em>sample picks</em></div>
              {SAMPLE_PICKS.map(p => (
                <div className="hpf-pred" key={p.player}>
                  <div className="hpf-pred-top">
                    <span>{p.player} · {p.team}</span>
                    <span className="mono">O {p.line} {p.statAbbr}</span>
                  </div>
                  <div className="hpf-conf-track"><div className="hpf-conf-fill" style={{ width: `${p.confidence}%` }}></div></div>
                </div>
              ))}
              <div className="hpf-lock">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="11" width="14" height="9" rx="1.5" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
                <span>Real picks drop daily</span>
                <small>Available by 4:00 PM ET</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-decorations" aria-hidden="true">
        <svg className="baseball-icon" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="white" stroke="#E0E0E0" strokeWidth="1"/>
          <path d="M 20 15 Q 12 40 20 65" stroke="#C62828" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 15 20 L 20 22 L 25 20" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 13 30 L 18 32 L 23 30" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 12 40 L 17 42 L 22 40" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 13 50 L 18 52 L 23 50" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 15 60 L 20 62 L 25 60" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 60 15 Q 68 40 60 65" stroke="#C62828" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M 55 22 L 60 20 L 65 22" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 57 32 L 62 30 L 67 32" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 58 42 L 63 40 L 68 42" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 57 52 L 62 50 L 67 52" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M 55 62 L 60 60 L 65 62" stroke="#C62828" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  );
}

export default Hero;
