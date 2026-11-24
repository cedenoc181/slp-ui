import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import cbpcService from '../../../data/services/cbpcService';
import { KALSHI_CBPC_PRICES } from '../../../data/constants/featureFlags';
import { Section, TeamLogo } from './winterUi';

/*
  Kalshi pregame prices for one winter-league game: admin-only, behind the
  KALSHI_CBPC_PRICES flag (default off). Kalshi's display terms haven't been
  reviewed, so nothing here may reach regular or paying users: the gate
  renders nothing, and makes no request, unless the flag is on AND the viewer
  is an admin.

  Most quotes are illiquid (placeholder books around 0.12 / 0.88), so an
  illiquid mid is greyed and labeled rather than read as a probability. The
  two sides come from separate books and needn't add up to 100%.
*/

const POLL_MS = 5 * 60 * 1000; // the server caches this route for 5 minutes

const price = (v) => (v == null ? '—' : Number(v).toFixed(2));
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const contracts = (v) => (v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }));

function ago(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

// Keep refreshing until both pregame prices are locked (final) and first
// pitch has passed; a locked price never changes.
function stillMoving(data) {
  if (!data?.available) return false;
  const sides = [data.home, data.away];
  if (sides.some(s => s.pregame && s.pregame.final === false)) return true;
  return data.first_pitch ? new Date(data.first_pitch).getTime() > Date.now() : false;
}

function TeamSide({ side }) {
  const { market, pregame } = side;
  const illiquid = pregame && !pregame.liquid;
  return (
    <div className="wb-kalshi-side">
      <div className="wb-kalshi-team">
        <TeamLogo src={side.logo_url} abbr={side.team_abbreviation} name={side.team_name} size={28} />
        <span>{side.team_name}</span>
      </div>
      {!market ? (
        <p className="wb-faint">No Kalshi market for this team.</p>
      ) : !pregame ? (
        <p className="wb-faint">No pregame quote.</p>
      ) : (
        <>
          <div className={`wb-kalshi-nums${illiquid ? ' wb-kalshi-nums--illiquid' : ''}`}>
            <span className="wb-kalshi-mid">{pct(pregame.mid)}</span>
            <span>Bid / ask <b>{price(pregame.yes_bid)} / {price(pregame.yes_ask)}</b></span>
            <span>Volume <b>{contracts(pregame.volume)}</b></span>
          </div>
          <div className="wb-kalshi-tags">
            {illiquid && <span className="wb-kalshi-tag">Illiquid (wide spread / low volume)</span>}
            {pregame.final === false && <span className="wb-kalshi-tag">Provisional · updated {ago(pregame.price_ts)}</span>}
            {pregame.mid == null && <span className="wb-kalshi-tag">One side of the book is empty</span>}
          </div>
        </>
      )}
    </div>
  );
}

function settledLine(data) {
  const sides = [data.away, data.home].filter(s => s.market);
  const winner = sides.find(s => s.market.result === 'yes');
  if (winner) return `Kalshi settled: ${winner.team_name} won`;
  if (sides.length && sides.every(s => s.market.status === 'finalized' && s.market.result == null)) {
    return 'Kalshi settled with no result (cancelled game, both sides at 0.50)';
  }
  return null;
}

function KalshiPrices({ league, gamePk }) {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    cbpcService.getCbpcGameKalshi(league, gamePk, { fresh: tick > 0 })
      .then(d => { if (alive) setData(d); })
      // 404 (not this league's game) or any failure: show nothing, quietly.
      .catch(() => { if (alive) setData(false); });
    return () => { alive = false; };
  }, [league, gamePk, tick]);

  const moving = stillMoving(data);
  useEffect(() => {
    if (!moving) return undefined;
    const t = setInterval(() => setTick(n => n + 1), POLL_MS);
    return () => clearInterval(t);
  }, [moving]);

  if (!data) return null;
  const settled = data.available ? settledLine(data) : null;
  return (
    <Section title="Kalshi market" aside={<span className="wb-kalshi-admin">Admin only · not for users</span>}>
      <div className="wb-kalshi">
        {!data.available ? (
          <p className="wb-faint">No Kalshi market for this game.</p>
        ) : (
          <>
            <p className="wb-kalshi-note">Implied win probability = pregame mid. The two sides are separate books and needn't add up to 100%.</p>
            <div className="wb-kalshi-grid">
              <TeamSide side={data.away} />
              <TeamSide side={data.home} />
            </div>
            {settled && <p className="wb-kalshi-settled">{settled}</p>}
          </>
        )}
        <p className="wb-kalshi-source">Source: Kalshi</p>
      </div>
    </Section>
  );
}

// The gate. Kalshi has no Serie del Caribe markets, so cs is skipped too.
export default function KalshiAdminPanel({ league, gamePk }) {
  const { isAdmin } = useAuth();
  if (!KALSHI_CBPC_PRICES || !isAdmin || league === 'cs') return null;
  return <KalshiPrices league={league} gamePk={gamePk} />;
}
