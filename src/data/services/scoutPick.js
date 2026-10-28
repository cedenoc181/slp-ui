/**
 * Scout AI prop picks arrive as a combined string — `pick: "Over 0.5"` — and
 * batter picks leave `line` null. Split it so callers get a clean side
 * ("Over" | "Under") and line. An explicit `line` field still wins.
 *
 * @param {{ pick?: string, line?: number|string|null }|null} aiPick
 * @returns {{ side: 'Over'|'Under'|null, line: number|null }}
 */
export function parseScoutPick(aiPick) {
  const raw = String(aiPick?.pick ?? '').trim();
  const m = raw.match(/^(over|under)\b\s*([-+]?\d+(?:\.\d+)?)?/i);
  const side = m ? (m[1].toLowerCase() === 'over' ? 'Over' : 'Under') : null;
  const explicit = aiPick?.line != null && aiPick.line !== '' ? Number(aiPick.line) : NaN;
  const parsed = m?.[2] != null ? Number(m[2]) : NaN;
  const line = !Number.isNaN(explicit) ? explicit : !Number.isNaN(parsed) ? parsed : null;
  return { side, line };
}
