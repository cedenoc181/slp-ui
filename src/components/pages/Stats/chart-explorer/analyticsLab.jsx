// ============================================================================
// ANALYTICS LAB
// ============================================================================
// A single interactive chart explorer. Users build a semantic query through
// controls — grain, group-by dimensions, X/Y measures, filters, sort, limit —
// and the backend returns flat rows + axis metadata. The same payload renders
// as scatter / horizontal bar / line; switching type never refetches. Each
// point is clickable to drill into a deeper layer.
//
// Everything queryable is discovered from GET /analytics/schema — no metric,
// dimension, or unit list is hardcoded here.
// ============================================================================

import React, { useState, useMemo } from 'react';

import useAnalyticsExplorer from './hooks/useAnalyticsExplorer';
import { buildFieldMap } from './utils';
import {
  QueryBuilderPanel,
  FilterChips,
  ChartTypeSwitcher,
  ChartCanvas,
  PointDetailDrawer,
} from './components';

export default function AnalyticsLab() {
  const explorer = useAnalyticsExplorer();
  const {
    schema, schemaLoading, schemaError, reloadSchema,
    grain, setGrain,
    dimensions, toggleDimension,
    xMeasure, setXMeasure, yMeasure, setYMeasure,
    filters, setFilter, clearFilter, clearAllFilters,
    sort, setSortField, toggleSortDir,
    limit, setLimit,
    rows, meta, queryLoading, queryError,
    chartType, setChartType,
  } = explorer;

  const [selectedRow, setSelectedRow] = useState(null);
  const fieldMap = useMemo(() => buildFieldMap(schema), [schema]);

  // ── Schema loading / error gates ──────────────────────────────────────────
  if (schemaLoading) {
    return (
      <div className="analytics-lab-page">
        <LabHeader />
        <div className="lab-state">
          <div className="lab-spinner" />
          <p>Loading the analytics workbench…</p>
        </div>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="analytics-lab-page">
        <LabHeader />
        <div className="lab-state lab-state--error">
          <p>Couldn’t load the analytics schema.</p>
          <span className="lab-state__detail">{schemaError}</span>
          <button className="lab-retry" onClick={reloadSchema}>Try again</button>
        </div>
      </div>
    );
  }

  const hasMeasures = !!(meta?.x || xMeasure);
  const rowCount = meta?.row_count ?? rows.length;

  return (
    <div className="analytics-lab-page">
      <LabHeader />

      <div className="lab-layout">
        <QueryBuilderPanel
          schema={schema}
          grain={grain} setGrain={setGrain}
          dimensions={dimensions} toggleDimension={toggleDimension}
          xMeasure={xMeasure} setXMeasure={setXMeasure}
          yMeasure={yMeasure} setYMeasure={setYMeasure}
          filters={filters} setFilter={setFilter} clearFilter={clearFilter}
          sort={sort} setSortField={setSortField} toggleSortDir={toggleSortDir}
          limit={limit} setLimit={setLimit}
        />

        <main className="lab-main">
          <div className="lab-main__bar">
            <FilterChips
              filters={filters}
              fieldMap={fieldMap}
              onRemove={clearFilter}
              onClearAll={clearAllFilters}
            />
            <div className="lab-main__bar-right">
              {!queryLoading && hasMeasures && (
                <span className="lab-count">{rowCount} {rowCount === 1 ? 'row' : 'rows'}</span>
              )}
              <ChartTypeSwitcher
                options={meta?.suggested_charts}
                value={chartType}
                onChange={setChartType}
              />
            </div>
          </div>

          <div className="lab-canvas">
            {queryLoading && (
              <div className="lab-canvas__overlay"><div className="lab-spinner" /></div>
            )}

            {queryError && !queryLoading && (
              <div className="lab-state lab-state--error">
                <p>Query failed.</p>
                <span className="lab-state__detail">{queryError}</span>
              </div>
            )}

            {!queryError && !hasMeasures && (
              <div className="lab-state">
                <p>Pick at least one measure to plot.</p>
              </div>
            )}

            {!queryError && hasMeasures && rows.length === 0 && !queryLoading && (
              <div className="lab-state">
                <p>No rows match these filters.</p>
                <span className="lab-state__detail">Loosen a filter or widen the season range.</span>
              </div>
            )}

            {!queryError && hasMeasures && rows.length > 0 && (
              <ChartCanvas
                rows={rows}
                meta={meta}
                chartType={chartType}
                dimensions={dimensions}
                fieldMap={fieldMap}
                onSelectPoint={setSelectedRow}
              />
            )}
          </div>
        </main>
      </div>

      {selectedRow && (
        <PointDetailDrawer
          row={selectedRow}
          meta={meta}
          dimensions={dimensions}
          fieldMap={fieldMap}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}

function LabHeader() {
  return (
    <header className="lab-page-header">
      <div className="lab-page-header__inner">
        <h1>Analytics Lab</h1>
        <p>Build a chart from any combination of MLB team-season metrics — filter like SQL, see it as scatter, bars, or a line.</p>
      </div>
    </header>
  );
}
