// ============================================================================
// ChartTypeSwitcher
// ============================================================================
// Toggle between the chart types the server suggested for the current payload
// (meta.suggested_charts). Switching is a pure client re-render — never a
// refetch.
// ============================================================================

import React from 'react';

const LABELS = {
  scatter: { label: 'Scatter', icon: '⠿' },
  horizontal_bar: { label: 'Bars', icon: '▤' },
  bar: { label: 'Bars', icon: '▤' },
  line: { label: 'Line', icon: '╱' },
};

export default function ChartTypeSwitcher({ options, value, onChange }) {
  const types = options && options.length ? options : ['scatter'];
  return (
    <div className="lab-chart-switch" role="tablist" aria-label="Chart type">
      {types.map((t) => {
        const meta = LABELS[t] || { label: t, icon: '◈' };
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active}
            className={`lab-chart-switch__btn ${active ? 'is-active' : ''}`}
            onClick={() => onChange(t)}
          >
            <span className="lab-chart-switch__icon" aria-hidden="true">{meta.icon}</span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
