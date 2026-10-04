// ============================================================================
// QueryBuilderPanel
// ============================================================================
// The left-hand control surface. Every control is generated from the
// /analytics/schema response — grain, X/Y measure pickers, group-by
// dimensions, per-field filters, sort, and limit. Nothing is hardcoded.
// ============================================================================

import React from 'react';
import FilterControl from './FilterControl';

export default function QueryBuilderPanel({
  schema,
  grain, setGrain,
  dimensions, toggleDimension,
  xMeasure, setXMeasure,
  yMeasure, setYMeasure,
  filters, setFilter, clearFilter,
  sort, setSortField, toggleSortDir,
  limit, setLimit,
}) {
  const dims = schema?.dimensions || [];
  const measures = schema?.measures || [];
  // grains is an object keyed by id: { team_season: { label, description } }
  const grainEntries = Object.entries(schema?.grains || {});

  // Filterable fields = anything that declares operators.
  const filterableFields = [...dims, ...measures].filter(
    (f) => Array.isArray(f.operators) && f.operators.length > 0,
  );

  // Sort can target any selected measure or grouping dimension.
  const sortableFields = [
    ...measures.filter((m) => m.field === xMeasure || m.field === yMeasure),
    ...dims.filter((d) => dimensions.includes(d.field)),
  ];
  const activeSort = sort[0] || {};

  return (
    <aside className="lab-panel" aria-label="Chart query builder">
      {grainEntries.length > 1 && (
        <Section title="Grain" hint="What one data point represents">
          <select className="lab-select" value={grain || ''} onChange={(e) => setGrain(e.target.value)}>
            {grainEntries.map(([id, g]) => (
              <option key={id} value={id}>{g?.label || prettyGrain(id)}</option>
            ))}
          </select>
        </Section>
      )}

      <Section title="Measures" hint="Add a 2nd to unlock scatter">
        <div className="lab-field">
          <label className="lab-field__label">Measure 1</label>
          <MeasureSelect value={xMeasure} measures={measures} onChange={setXMeasure} allowNone={false} />
        </div>
        <div className="lab-field">
          <label className="lab-field__label">Measure 2 (optional)</label>
          <MeasureSelect value={yMeasure} measures={measures} onChange={setYMeasure} allowNone />
        </div>
      </Section>

      <Section title="Group by" hint="What each point / bar represents">
        <div className="lab-pills">
          {dims.map((d) => (
            <button
              key={d.field}
              type="button"
              className={`lab-pill ${dimensions.includes(d.field) ? 'is-active' : ''}`}
              onClick={() => toggleDimension(d.field)}
            >
              {d.label}
            </button>
          ))}
          {dims.length === 0 && <span className="lab-muted">No dimensions available</span>}
        </div>
      </Section>

      {filterableFields.length > 0 && (
        <Section title="Filters" hint="Narrow the data">
          <div className="lab-filters">
            {filterableFields.map((f) => (
              <FilterControl
                key={f.field}
                field={f}
                value={filters[f.field]}
                onChange={(next) => setFilter(f.field, next.op, next.value)}
                onClear={() => clearFilter(f.field)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Sort & limit">
        <div className="lab-field">
          <label className="lab-field__label">Sort by</label>
          <div className="lab-sort-row">
            <select
              className="lab-select"
              value={activeSort.field || ''}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="" disabled>Choose…</option>
              {sortableFields.map((f) => (
                <option key={f.field} value={f.field}>{f.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="lab-dir-btn"
              onClick={toggleSortDir}
              disabled={!activeSort.field}
              title={activeSort.dir === 'asc' ? 'Ascending' : 'Descending'}
              aria-label={`Sort ${activeSort.dir === 'asc' ? 'ascending' : 'descending'}`}
            >
              {activeSort.dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <div className="lab-field">
          <label className="lab-field__label">Limit ({limit})</label>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Result limit"
          />
        </div>
      </Section>
    </aside>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="lab-section">
      <div className="lab-section__head">
        <h3 className="lab-section__title">{title}</h3>
        {hint && <span className="lab-section__hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function MeasureSelect({ value, measures, onChange, allowNone }) {
  return (
    <select className="lab-select" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowNone && <option value="">None</option>}
      {measures.map((m) => (
        <option key={m.field} value={m.field}>
          {m.label}{m.unit ? ` (${m.unit})` : ''}
        </option>
      ))}
    </select>
  );
}

function prettyGrain(g) {
  return String(g).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
