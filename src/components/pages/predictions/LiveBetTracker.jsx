/**
 * LiveBetTracker — the temporary "live" strip shown on a Bet Library card while
 * the bet's game is in progress. Driven entirely by buildLiveTracker()'s
 * descriptor; renders nothing real it doesn't have (null metric → "—").
 */

function InningLabel({ inning }) {
  if (!inning) return <span className="bl-live-inning">In progress</span>;
  return (
    <span className="bl-live-inning">
      <span className="bl-live-half">{inning.half}</span> {inning.num}
    </span>
  );
}

function Score({ t, awayAbbr, homeAbbr, away, home, highlightAbbr }) {
  const a = away ?? 0;
  const h = home ?? 0;
  return (
    <span className="bl-live-score">
      <span className={`bl-live-team${highlightAbbr === awayAbbr ? ' pick' : ''}${a > h ? ' lead' : ''}`}>
        {awayAbbr} <strong>{away ?? '—'}</strong>
      </span>
      <span className="bl-live-score-sep">–</span>
      <span className={`bl-live-team${highlightAbbr === homeAbbr ? ' pick' : ''}${h > a ? ' lead' : ''}`}>
        <strong>{home ?? '—'}</strong> {homeAbbr}
      </span>
    </span>
  );
}

export default function LiveBetTracker({ tracker }) {
  if (!tracker) return null;

  let body = null;
  let toneClass = '';

  if (tracker.kind === 'score') {
    const tag = tracker.market === 'runline' && tracker.covering != null
      ? (tracker.covering ? 'Covering' : 'Not covering')
      : tracker.market === 'moneyline' && tracker.leading != null
        ? (tracker.leading ? 'Leading' : 'Trailing')
        : null;
    if (tracker.covering === true || tracker.leading === true) toneClass = ' tone-good';
    if (tracker.covering === false || tracker.leading === false) toneClass = ' tone-bad';
    body = (
      <>
        <Score {...tracker} highlightAbbr={tracker.pickAbbr} />
        {tag && <span className="bl-live-tag">{tag}</span>}
      </>
    );
  } else if (tracker.kind === 'total') {
    const sideUpper = (tracker.side || '').toLowerCase();
    // Good = currently on the side you bet.
    if (tracker.state && sideUpper) {
      if (tracker.state === sideUpper) toneClass = ' tone-good';
      else toneClass = ' tone-bad';
    }
    body = (
      <>
        <span className="bl-live-metric">
          <strong>{tracker.total ?? '—'}</strong> total runs
        </span>
        {tracker.line != null && (
          <span className="bl-live-target">
            {tracker.side ? `${tracker.side[0].toUpperCase()}${tracker.side.slice(1)} ` : ''}{tracker.line}
          </span>
        )}
        <Score {...tracker} />
      </>
    );
  } else if (tracker.kind === 'player') {
    if (tracker.state === 'hit') toneClass = ' tone-good';
    else if (tracker.state === 'against') toneClass = ' tone-bad';
    body = (
      <>
        <span className="bl-live-metric">
          <strong>{tracker.value ?? '—'}</strong> {tracker.statLabel}
        </span>
        {tracker.line != null && (
          <span className="bl-live-target">
            {tracker.side ? `${tracker.side} ` : ''}{tracker.line}
          </span>
        )}
        {!tracker.playerFound && <span className="bl-live-note">awaiting live stats</span>}
      </>
    );
  }

  return (
    <div className={`bl-live${toneClass}`} role="status" aria-live="polite">
      <span className="bl-live-badge">
        <span className="bl-live-dot" aria-hidden="true" />
        LIVE
      </span>
      <InningLabel inning={tracker.inning} />
      <div className="bl-live-body">{body}</div>
    </div>
  );
}
