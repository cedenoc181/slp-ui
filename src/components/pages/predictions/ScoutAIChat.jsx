import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import PredictionsNav from './PredictionsNav';
import '../../../styles/predictions-page-styling/predictions.css';
import '../../../styles/predictions-page-styling/scout-ai-chat.css';
import analysisIcon from '../../../assets/icons/analysis.png';

// ── Suggested prompts that pre-fill the input ───────────────────────────────
const SUGGESTED_PROMPTS = [
  {
    id: 'best-pick',
    label: "What's the best pick of the day?",
    icon: '🎯',
    category: 'Top Picks',
  },
  {
    id: 'parlay',
    label: 'What bets should I parlay together with the best probability?',
    icon: '🔗',
    category: 'Parlays',
  },
  {
    id: 'safest',
    label: 'Show me the safest plays today',
    icon: '🛡️',
    category: 'Top Picks',
  },
  {
    id: 'value',
    label: "Where's the best value vs. the market today?",
    icon: '💰',
    category: 'Value',
  },
  {
    id: 'pitcher-ks',
    label: 'Which pitcher has the best strikeout edge tonight?',
    icon: '⚾',
    category: 'Props',
  },
  {
    id: 'batter-hr',
    label: 'Top home-run prop plays for tonight',
    icon: '🏏',
    category: 'Props',
  },
  {
    id: 'totals',
    label: 'Which over/under totals look strongest?',
    icon: '📈',
    category: 'Game Lines',
  },
  {
    id: 'avoid',
    label: 'Any games or props I should fade tonight?',
    icon: '⚠️',
    category: 'Avoid',
  },
];

// ── Mock streaming response generator (replace with real LLM later) ─────────
function mockResponseFor(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('best pick') || lower.includes('top pick')) {
    return `Based on tonight's slate and our model's confidence scores, here's my top pick:

**Tarik Skubal — Over 6.5 Strikeouts (-115)**

Skubal is matched up against a Pirates lineup that ranks 27th in K-rate vs. lefties (24.8%). His 31% CSW% is elite, his fastball is averaging 96.4mph this season, and the model has him at 7.4 projected K's against a line of 6.5.

Confidence: 4/5 dots · Model probability: 71% · EV: +18.3%

Want me to show alternative angles on this game, or move on to another pick?`;
  }
  if (lower.includes('parlay')) {
    return `Here's a 3-leg parlay built from tonight's highest-confidence plays:

1. **Dodgers ML** (-145) — model gives them 64.5% win prob vs. line implied 59.2%
2. **Aaron Judge Over 1.5 Total Bases** (-110) — playing in Yankee Stadium vs. a struggling lefty
3. **Dodgers vs Giants Over 7.5** (-108) — both bullpens compromised, projected total 9.1

Combined model probability: ~28%
Combined payout: +480
EV: +12.4%

⚠️ Reminder: parlays compound variance. The model favors single-leg plays for sustained ROI — only stack legs you'd take individually.`;
  }
  if (lower.includes('safest') || lower.includes('safe play')) {
    return `Tonight's safest plays — sorted by model confidence:

1. **Yankees ML** (-188) — 70% model prob, 5/5 confidence
2. **Mariners ML** (-145) — 67% model prob, 4/5 confidence
3. **Phillies Run Line -1.5** (+115) — 56% model prob, but line offers value

Heavy chalk like the Yankees-on-Boston isn't sexy, but the model agrees with the market here. If you're playing tight, single-leg the top one.`;
  }
  if (lower.includes('value') || lower.includes('edge')) {
    return `Best edge plays — model probability minus market-implied probability:

1. **Reds +118 ML** — model 58.5%, market 45.7% → **+12.8% edge**
2. **Twins +1.5 RL** — model 66%, market 62% → **+4% edge**
3. **Royals/Orioles Over 9.5** — model 54%, market 49% → **+5% edge**

Underdog ML edges historically outperform when our model disagrees with the market by 8%+. The Reds line is the standout tonight.`;
  }
  if (lower.includes('strikeout') || lower.includes('k') && lower.includes('pitcher')) {
    return `Top strikeout edges tonight (by EV):

1. **Tarik Skubal Over 6.5 K's** — projected 7.4, EV +18%
2. **Paul Skenes Over 7.5 K's** — projected 8.2, EV +12%
3. **Logan Webb Over 5.5 K's** — projected 6.8, EV +9%

Skubal is the cleanest play — best matchup and the most reliable swing-and-miss profile. Skenes is high-variance but the model loves the spot.`;
  }
  if (lower.includes('home run') || lower.includes('hr') || lower.includes('batter')) {
    return `Top HR prop plays tonight:

1. **Aaron Judge HR (+340)** — Yankee Stadium short porch + LHP matchup
2. **Shohei Ohtani HR (+290)** — facing a flyball-heavy righty in Coors-friendly conditions
3. **Pete Alonso HR (+380)** — Citi has played as a hitter's park lately

HRs are inherently volatile, but Judge in his park vs. lefties is the highest-confidence spot we have on the board.`;
  }
  if (lower.includes('over') || lower.includes('total') || lower.includes('under')) {
    return `Strongest totals plays tonight:

1. **Cubs/Phillies Over 8.0** — model projects 10.0, EV +11%
2. **Royals/Orioles Over 9.5** — model projects 10.6, EV +5%
3. **Rangers/Pirates Over 7.5** — model projects 11.3, EV +18% (largest edge of the night)

The Rangers/Pirates total is the standout. Both bullpens have been overworked, the parks favor offense, and the model is well above the line.`;
  }
  if (lower.includes('fade') || lower.includes('avoid') || lower.includes('stay away')) {
    return `Plays I'd fade or skip tonight:

1. **Dodgers RL -1.5 (-125)** — model only gives them 53% to cover; better to play moneyline
2. **Hits Allowed Unders on Aaron Nola** — sample size is too thin and his last 3 starts inflate his line
3. **Any same-game parlay involving the Yankees** — the legs are too correlated to retain real edge

When in doubt, sit out. Bad plays cost more than missed plays.`;
  }
  // Fallback
  return `Great question. Here's how I'd think about it:

I pull from tonight's prediction model output, current sportsbook odds across DK / FanDuel / BetMGM / Caesars, and Scout AI's matchup-level scouting reports. For most questions, I rank plays by EV (model probability vs. market-implied probability), then filter by confidence (number of supporting signals).

If you can rephrase the question with a specific market in mind — strikeouts, hits, moneyline, totals — I can give you a sharper answer. Or pick one of the suggestion chips above to see an example.`;
}

// ── Avatar bubbles ──────────────────────────────────────────────────────────
function ScoutAvatar() {
  return (
    <div className="scout-chat__avatar scout-chat__avatar--bot">
      <img src={analysisIcon} alt="" />
    </div>
  );
}

function UserAvatar({ name }) {
  const initial = (name || 'U').charAt(0).toUpperCase();
  return (
    <div className="scout-chat__avatar scout-chat__avatar--user">{initial}</div>
  );
}

// ── Markdown-lite (bold + bullets) ──────────────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function MessageBody({ text }) {
  const lines = text.split('\n');
  const out = [];
  let listBuf = null;
  let key = 0;

  const flush = () => {
    if (listBuf) {
      out.push(<ul key={key++} className="scout-chat__list">{listBuf}</ul>);
      listBuf = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^\d+\.\s/.test(line) || /^[-•]\s/.test(line)) {
      if (!listBuf) listBuf = [];
      const txt = line.replace(/^\d+\.\s|^[-•]\s/, '');
      listBuf.push(<li key={key++}>{renderInline(txt)}</li>);
    } else {
      flush();
      out.push(<p key={key++}>{renderInline(line)}</p>);
    }
  }
  flush();
  return <>{out}</>;
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ScoutAIChat() {
  const navigate = useNavigate();
  const { isAuthenticated, isPremium, user, loading } = useAuth();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hey — I'm Scout AI. Ask me about tonight's slate and I'll cut through the noise. Try one of the suggestions below, or type your own question.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput]       = useState('');
  const [thinking, setThinking] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Premium gate
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/account', { state: { from: { pathname: '/predictions/scout-ai' } } });
      return;
    }
    if (!isPremium) {
      navigate('/predictions');
    }
  }, [loading, isAuthenticated, isPremium, navigate]);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    setSuggestionsOpen(false); // collapse the suggestions panel after each send
    setMessages(m => [...m, { role: 'user', text, ts: Date.now() }]);
    setThinking(true);
    // Mock latency — replace with streaming LLM call
    await new Promise(r => setTimeout(r, 1100));
    setMessages(m => [...m, { role: 'assistant', text: mockResponseFor(text), ts: Date.now() }]);
    setThinking(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading || !isAuthenticated || !isPremium) return null;

  return (
    <div className="predictions-page scout-chat-page">
      <div className="predictions-content">
        <PredictionsNav />

        {/* Hero */}
        <div className="scout-chat__hero">
          <div className="scout-chat__hero-icon">
            <img src={analysisIcon} alt="" />
          </div>
          <div className="scout-chat__hero-text">
            <span className="scout-chat__eyebrow">✨ Scout AI</span>
            <h1>Your AI scout — ask anything about tonight's slate.</h1>
            <p>Built on top of our prediction model and live odds. Get the picks worth your time without scrolling every prop page.</p>
          </div>
        </div>

        {/* Chat surface */}
        <div className="scout-chat" role="log" aria-live="polite">
          <div className="scout-chat__messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`scout-chat__message scout-chat__message--${m.role}`}
              >
                {m.role === 'assistant' ? <ScoutAvatar /> : <UserAvatar name={user?.displayName || user?.email} />}
                <div className="scout-chat__bubble">
                  <MessageBody text={m.text} />
                </div>
              </div>
            ))}
            {thinking && (
              <div className="scout-chat__message scout-chat__message--assistant">
                <ScoutAvatar />
                <div className="scout-chat__bubble scout-chat__bubble--thinking">
                  <span className="scout-chat__dot" />
                  <span className="scout-chat__dot" />
                  <span className="scout-chat__dot" />
                </div>
              </div>
            )}
          </div>

          {/* Suggested prompts — always present, collapses after each send */}
          <div className={`scout-chat__suggestions${suggestionsOpen ? ' is-open' : ' is-collapsed'}`}>
            <button
              type="button"
              className="scout-chat__suggestions-toggle"
              onClick={() => setSuggestionsOpen(o => !o)}
              aria-expanded={suggestionsOpen}
              aria-controls="scout-chat-suggestions-grid"
            >
              <span className="scout-chat__suggestions-toggle-left">
                <span className="scout-chat__suggestions-toggle-icon" aria-hidden="true">💡</span>
                <span className="scout-chat__suggestions-label">Suggested questions</span>
                {!suggestionsOpen && (
                  <span className="scout-chat__suggestions-count">
                    {SUGGESTED_PROMPTS.length} ideas
                  </span>
                )}
              </span>
              <span className="scout-chat__suggestions-chevron" aria-hidden="true">
                {suggestionsOpen ? '▴' : '▾'}
              </span>
            </button>

            {suggestionsOpen && (
              <div id="scout-chat-suggestions-grid" className="scout-chat__suggestions-grid">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="scout-chat__suggestion"
                    onClick={() => send(p.label)}
                  >
                    <span className="scout-chat__suggestion-icon">{p.icon}</span>
                    <div className="scout-chat__suggestion-body">
                      <span className="scout-chat__suggestion-label">{p.label}</span>
                      <span className="scout-chat__suggestion-cat">{p.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="scout-chat__input-row">
            <textarea
              className="scout-chat__input"
              placeholder="Ask Scout AI anything about tonight's slate…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={thinking}
            />
            <button
              type="button"
              className="scout-chat__send"
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <p className="scout-chat__footnote">
            ⚠ Scout AI uses our prediction model and live odds to surface picks. For entertainment only — not financial advice. Please gamble responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
