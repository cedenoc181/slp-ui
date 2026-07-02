// ============================================================================
// PointDetailDrawer
// ============================================================================
// Slide-in detail for a clicked point/bar. v1 surfaces the point's dimensions
// (team, season, …) and every measure that came back for it. It carries the
// full row so a future deeper layer (team → roster → player) can fetch and
// render here without changing the chart code.
// ============================================================================

import React, { useEffect } from 'react';
import { formatValue } from '../utils';

export default function PointDetailDrawer({ row, meta, dimensions, fieldMap, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!row) return null;

  const dims = (dimensions || []).filter((d) => row[d] != null);
  // Measures present on the row = numeric keys that aren't dimensions/internal.
  const measureFields = Object.keys(row).filter(
    (k) => !k.startsWith('__') && !dims.includes(k),
  );
  const title = dims.map((d) => row[d]).join(' · ') || 'Detail';

  return (
    <div className="lab-overlay" onClick={onClose}>
      <aside className="lab-drawer" role="dialog" aria-label="Point detail" onClick={(e) => e.stopPropagation()}>
        <button className="lab-drawer__close" onClick={onClose} aria-label="Close">×</button>

        <header className="lab-drawer__header">
          <h2 className="lab-drawer__title">{title}</h2>
          <div className="lab-drawer__dims">
            {dims.map((d) => (
              <span key={d} className="lab-drawer__dim">
                <span className="lab-drawer__dim-label">{fieldMap?.[d]?.label || d}</span>
                <span className="lab-drawer__dim-val">{formatValue(row[d], fieldMap?.[d]?.unit, d)}</span>
              </span>
            ))}
          </div>
        </header>

        <div className="lab-drawer__body">
          <h3 className="lab-drawer__section">Measures</h3>
          <dl className="lab-stat-grid">
            {measureFields.map((f) => {
              const fm = fieldMap?.[f] || {};
              return (
                <div key={f} className="lab-stat">
                  <dt>{fm.label || f}</dt>
                  <dd>{formatValue(row[f], fm.unit, f)}</dd>
                </div>
              );
            })}
          </dl>

          <div className="lab-drawer__future">
            <span className="lab-drawer__future-icon" aria-hidden="true">🔎</span>
            <p>Roster &amp; player breakdown for this {meta?.x ? 'selection' : 'team-season'} will appear here.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
