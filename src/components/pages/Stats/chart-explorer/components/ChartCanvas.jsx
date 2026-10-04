// ============================================================================
// ChartCanvas
// ============================================================================
// Renders the current rows+meta payload as scatter / horizontal-bar / line via
// Recharts. The SAME payload drives every chart type — switching is a pure
// render choice (no refetch). Points/bars are clickable and carry their full
// row (team + season + measures) up via onSelectPoint for drill-in.
// ============================================================================

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart, Scatter,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';

import { rowLabel, rowKey, formatTick, formatValue, isNumericType } from '../utils';

const ACCENT = '#2dd4bf';
const GRID = 'rgba(255,255,255,0.08)';
const AXIS = 'rgba(255,255,255,0.55)';

export default function ChartCanvas({ rows, meta, chartType, dimensions, fieldMap, onSelectPoint }) {
  const xMeta = meta?.x || null;
  const yMeta = meta?.y || null;

  // Enrich each row with a stable label + key for categories / tooltips / keys.
  const data = useMemo(
    () => (rows || []).map((r) => ({
      ...r,
      __label: rowLabel(r, dimensions) || r[xMeta?.field],
      __key: rowKey(r, dimensions),
    })),
    [rows, dimensions, xMeta],
  );

  if (!data.length) return null;

  const handleClick = (state) => {
    const row = state?.activePayload?.[0]?.payload;
    if (row && onSelectPoint) onSelectPoint(row);
  };

  const tooltip = (
    <Tooltip
      cursor={{ stroke: ACCENT, strokeWidth: 1, strokeDasharray: '4 4', fill: 'rgba(45,212,191,0.06)' }}
      content={<LabTooltip xMeta={xMeta} yMeta={yMeta} />}
    />
  );

  // The server assigns axis roles: with two measures both x & y are numeric
  // (scatter); with one measure x is a dimension and y is the measure. Derive
  // roles from each axis's `type` rather than assuming.
  const xNum = isNumericType(xMeta?.type);
  const yNum = isNumericType(yMeta?.type);

  // ── Scatter: two numeric axes ─────────────────────────────────────────────
  if (chartType === 'scatter' && xMeta && yMeta && xNum && yNum) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 48, left: 16 }} onClick={handleClick}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number" dataKey={xMeta.field}
            name={xMeta.label} domain={axisDomain(xMeta)}
            tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS}
            tickFormatter={(v) => formatTick(v, xMeta.unit, xMeta.field)}
            label={axisLabel(xMeta, 'bottom')}
          />
          <YAxis
            type="number" dataKey={yMeta.field}
            name={yMeta.label} domain={axisDomain(yMeta)}
            tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS}
            tickFormatter={(v) => formatTick(v, yMeta.unit, yMeta.field)}
            label={axisLabel(yMeta, 'left')}
          />
          <ZAxis range={[70, 70]} />
          {tooltip}
          <Scatter data={data} fill={ACCENT} fillOpacity={0.8} cursor="pointer" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── Horizontal bar: numeric value × category ──────────────────────────────
  if (chartType === 'horizontal_bar' || chartType === 'bar') {
    // Value axis = the numeric meta axis; category = the other axis if it's
    // categorical, else the composite row label (e.g. "Giants · 2012").
    const valueMeta = xNum ? xMeta : (yNum ? yMeta : null);
    if (!valueMeta) return null;
    // Category = the composite row label (built from every grouping dimension),
    // so team-seasons stay distinct instead of collapsing on team alone.
    const catKey = '__label';
    const barHeight = Math.max(320, data.length * 30);
    return (
      <div className="lab-scroll-y" style={{ height: '100%' }}>
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart layout="vertical" data={data} margin={{ top: 8, right: 32, bottom: 24, left: 8 }} onClick={handleClick}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis
              type="number" dataKey={valueMeta.field} domain={axisDomain(valueMeta)}
              tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS}
              tickFormatter={(v) => formatTick(v, valueMeta.unit, valueMeta.field)}
              label={axisLabel(valueMeta, 'bottom')}
            />
            <YAxis
              type="category" dataKey={catKey} width={150}
              tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} interval={0}
            />
            {tooltip}
            <Bar dataKey={valueMeta.field} fill={ACCENT} radius={[0, 4, 4, 0]} cursor="pointer">
              {data.map((d) => <Cell key={d.__key} fill={ACCENT} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Line: numeric measure across an ordinal axis (season preferred) ────────
  if (chartType === 'line') {
    const valueMeta = xNum ? xMeta : (yNum ? yMeta : null);
    if (!valueMeta) return null;
    const otherMeta = valueMeta === xMeta ? yMeta : xMeta;
    // Prefer a season/year dimension for the time axis; else the categorical
    // meta axis; else the composite label.
    const xField = pickLineXField(dimensions)
      || (otherMeta && !isNumericType(otherMeta.type) && otherMeta.field)
      || '__label';
    const xLabel = fieldMap?.[xField]?.label || otherMeta?.label || xField;
    const lineData = [...data].sort((a, b) => sortByDim(a, b, xField));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={lineData} margin={{ top: 16, right: 24, bottom: 48, left: 16 }} onClick={handleClick}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            dataKey={xField}
            tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS}
            label={{ value: xLabel, position: 'bottom', fill: AXIS, fontSize: 12 }}
          />
          <YAxis
            domain={axisDomain(valueMeta)}
            tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS}
            tickFormatter={(v) => formatTick(v, valueMeta.unit, valueMeta.field)}
            label={axisLabel(valueMeta, 'left')}
          />
          {tooltip}
          <Line
            type="monotone" dataKey={valueMeta.field}
            stroke={ACCENT} strokeWidth={2}
            dot={{ r: 4, fill: ACCENT, cursor: 'pointer' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// ── Custom tooltip ───────────────────────────────────────────────────────────
function LabTooltip({ active, payload, xMeta, yMeta }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="lab-tip">
      {row.__label && <div className="lab-tip__title">{row.__label}</div>}
      {xMeta && (
        <div className="lab-tip__row">
          <span>{xMeta.label}</span>
          <strong>{formatValue(row[xMeta.field], xMeta.unit, xMeta.field)}</strong>
        </div>
      )}
      {yMeta && yMeta.field !== xMeta?.field && (
        <div className="lab-tip__row">
          <span>{yMeta.label}</span>
          <strong>{formatValue(row[yMeta.field], yMeta.unit, yMeta.field)}</strong>
        </div>
      )}
      <div className="lab-tip__hint">Click to drill in</div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function axisDomain(m) {
  if (!m || typeof m.min !== 'number' || typeof m.max !== 'number') return ['auto', 'auto'];
  const pad = (m.max - m.min) * 0.08 || 1;
  return [Math.floor((m.min - pad) * 100) / 100, Math.ceil((m.max + pad) * 100) / 100];
}

function axisLabel(m, position) {
  if (!m) return undefined;
  const text = m.unit && m.unit !== 'season' ? `${m.label} (${m.unit})` : m.label;
  if (position === 'left') {
    return { value: text, angle: -90, position: 'insideLeft', fill: AXIS, fontSize: 12, style: { textAnchor: 'middle' } };
  }
  return { value: text, position: 'bottom', fill: AXIS, fontSize: 12, offset: 8 };
}

function pickLineXField(dimensions) {
  if (!dimensions || !dimensions.length) return null;
  return dimensions.find((d) => /season|year/i.test(d)) || null;
}

function sortByDim(a, b, field) {
  if (!field) return 0;
  const av = a[field];
  const bv = b[field];
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv));
}
