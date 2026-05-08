import React from 'react';
import './FilterBar.css';

const TIME_RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' },
];

const COLORS = [
  { label: 'All', value: null },
  { label: 'White', value: 'white' },
  { label: 'Black', value: 'black' },
];

const TIME_CONTROLS = [
  { label: 'All', value: null },
  { label: 'Rapid', value: 'rapid' },
  { label: 'Blitz', value: 'blitz' },
  { label: 'Bullet', value: 'bullet' },
];

export default function FilterBar({ filters, onChange }) {
  const { timeRange, color, timeClass } = filters;

  const update = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <span className="filter-label">Period</span>
        <div className="filter-pills">
          {TIME_RANGES.map((t) => (
            <button
              key={t.value}
              className={`filter-pill ${timeRange === t.value ? 'filter-pill--active' : ''}`}
              onClick={() => update('timeRange', t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Color</span>
        <div className="filter-pills">
          {COLORS.map((c) => (
            <button
              key={c.label}
              className={`filter-pill ${color === c.value ? 'filter-pill--active' : ''}`}
              onClick={() => update('color', c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Time control</span>
        <div className="filter-pills">
          {TIME_CONTROLS.map((tc) => (
            <button
              key={tc.label}
              className={`filter-pill ${timeClass === tc.value ? 'filter-pill--active' : ''}`}
              onClick={() => update('timeClass', tc.value)}
            >
              {tc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
