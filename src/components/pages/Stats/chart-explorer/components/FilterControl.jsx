// ============================================================================
// FilterControl
// ============================================================================
// Renders the right input for a single schema field based on its inferred
// control type: a toggle (boolean), a pill picker (enum), a min–max range
// (numeric), or a season-year range. Emits {op, value} up via onChange, or
// onClear when the control is emptied.
// ============================================================================

import React from 'react';
import { CONTROL, inferControl, formatValue } from '../utils';

export default function FilterControl({ field, value, onChange, onClear }) {
  const control = inferControl(field);
  const current = value || null; // { op, value }

  if (control === CONTROL.BOOLEAN) {
    const on = current?.op === 'eq' && current?.value === true;
    return (
      <div className="lab-filter">
        <div className="lab-filter__head">
          <span className="lab-filter__label">{field.label}</span>
        </div>
        <button
          type="button"
          className={`lab-toggle ${on ? 'is-on' : ''}`}
          role="switch"
          aria-checked={on}
          onClick={() => (on ? onClear() : onChange({ op: 'eq', value: true }))}
        >
          <span className="lab-toggle__track"><span className="lab-toggle__thumb" /></span>
          <span className="lab-toggle__text">{on ? 'Yes' : 'Any'}</span>
        </button>
      </div>
    );
  }

  if (control === CONTROL.ENUM) {
    const opts = field.values || [];
    const selected = current?.value;
    return (
      <div className="lab-filter">
        <div className="lab-filter__head">
          <span className="lab-filter__label">{field.label}</span>
          {selected != null && (
            <button type="button" className="lab-filter__clear" onClick={onClear}>Clear</button>
          )}
        </div>
        <div className="lab-pills">
          {opts.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lab = typeof opt === 'object' ? opt.label : String(opt);
            const active = selected === val;
            return (
              <button
                key={String(val)}
                type="button"
                className={`lab-pill ${active ? 'is-active' : ''}`}
                onClick={() => (active ? onClear() : onChange({ op: 'eq', value: val }))}
              >
                {lab}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (control === CONTROL.TEXT) {
    const val = typeof current?.value === 'string' ? current.value : '';
    return (
      <div className="lab-filter">
        <div className="lab-filter__head">
          <span className="lab-filter__label">{field.label}</span>
          {val && <button type="button" className="lab-filter__clear" onClick={onClear}>Clear</button>}
        </div>
        <input
          type="text"
          className="lab-num"
          placeholder={`Exact ${field.label.toLowerCase()}…`}
          value={val}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim() === '') onClear();
            else onChange({ op: 'eq', value: v });
          }}
        />
      </div>
    );
  }

  // RANGE + SEASON share a numeric min–max editor.
  const isSeason = control === CONTROL.SEASON;
  const unit = isSeason ? '' : (field.unit || '');
  const bounds = numericBounds(field, isSeason);
  const pair = Array.isArray(current?.value) ? current.value : [bounds.min, bounds.max];
  const [lo, hi] = pair;

  const emit = (nextLo, nextHi) => {
    const a = clampNum(nextLo, bounds.min, bounds.max);
    const b = clampNum(nextHi, bounds.min, bounds.max);
    onChange({ op: 'between', value: [Math.min(a, b), Math.max(a, b)] });
  };

  const active = Array.isArray(current?.value);

  return (
    <div className="lab-filter">
      <div className="lab-filter__head">
        <span className="lab-filter__label">
          {field.label}{unit ? <span className="lab-filter__unit"> ({unit})</span> : null}
        </span>
        {active && (
          <button type="button" className="lab-filter__clear" onClick={onClear}>Clear</button>
        )}
      </div>

      <div className="lab-range">
        <div className="lab-range__readout">
          <span>{isSeason ? lo : formatValue(lo, field.unit, field.field)}</span>
          <span className="lab-range__dash">—</span>
          <span>{isSeason ? hi : formatValue(hi, field.unit, field.field)}</span>
        </div>
        {bounds.known ? (
          <div className="lab-range__sliders">
            <input
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={bounds.step}
              value={lo}
              onChange={(e) => emit(Number(e.target.value), hi)}
              aria-label={`${field.label} minimum`}
            />
            <input
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={bounds.step}
              value={hi}
              onChange={(e) => emit(lo, Number(e.target.value))}
              aria-label={`${field.label} maximum`}
            />
          </div>
        ) : (
          <div className="lab-range__inputs">
            <input
              type="number"
              className="lab-num"
              placeholder="Min"
              value={active ? lo : ''}
              step={bounds.step}
              onChange={(e) => emit(Number(e.target.value), active ? hi : Number(e.target.value))}
            />
            <span className="lab-range__dash">to</span>
            <input
              type="number"
              className="lab-num"
              placeholder="Max"
              value={active ? hi : ''}
              step={bounds.step}
              onChange={(e) => emit(active ? lo : Number(e.target.value), Number(e.target.value))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Resolve slider bounds + step from the schema field; known=false ⇒ free inputs. */
function numericBounds(field, isSeason) {
  const hasMin = typeof field.min === 'number';
  const hasMax = typeof field.max === 'number';
  if (hasMin && hasMax) {
    const span = field.max - field.min;
    const step = isSeason ? 1 : span <= 5 ? 0.1 : span <= 50 ? 0.5 : 1;
    return { known: true, min: field.min, max: field.max, step };
  }
  return { known: false, min: field.min ?? 0, max: field.max ?? 0, step: isSeason ? 1 : 0.1 };
}

function clampNum(n, min, max) {
  if (Number.isNaN(n)) return min;
  if (typeof min === 'number' && n < min) return min;
  if (typeof max === 'number' && n > max) return max;
  return n;
}
