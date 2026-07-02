// ============================================================================
// FilterChips
// ============================================================================
// Human-readable summary of the active filter spec, e.g.
//   "WS Winners · 2010–2015 · 200–210 lbs"
// Each chip is removable; an overall "Clear all" appears when 2+ are active.
// ============================================================================

import React from 'react';
import { filtersToChips } from '../utils';

export default function FilterChips({ filters, fieldMap, onRemove, onClearAll }) {
  const chips = filtersToChips(filters, fieldMap);
  if (!chips.length) {
    return <div className="lab-chips lab-chips--empty">No filters — showing all rows</div>;
  }
  return (
    <div className="lab-chips">
      {chips.map((chip) => (
        <span key={chip.field} className="lab-chip">
          {chip.text}
          <button
            type="button"
            className="lab-chip__x"
            aria-label={`Remove ${chip.text}`}
            onClick={() => onRemove(chip.field)}
          >
            ×
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button type="button" className="lab-chips__clear" onClick={onClearAll}>Clear all</button>
      )}
    </div>
  );
}
