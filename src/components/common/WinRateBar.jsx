import React from 'react';

export default function WinRateBar({ label, wins, draws, losses }) {
  const total = wins + draws + losses;
  if (total === 0) return null;

  const winPct = Math.round((wins / total) * 100);
  const drawPct = Math.round((draws / total) * 100);
  const lossPct = 100 - winPct - drawPct;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '60px', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: '22px', background: 'var(--bg-tertiary)',
        borderRadius: '11px', overflow: 'hidden', display: 'flex'
      }}>
        <div style={{ width: `${winPct}%`, height: '100%', background: '#1D9E75', transition: 'width 0.4s ease' }} />
        <div style={{ width: `${drawPct}%`, height: '100%', background: '#BA7517', transition: 'width 0.4s ease' }} />
        <div style={{ width: `${lossPct}%`, height: '100%', background: '#E24B4A', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{
        fontSize: '13px', fontWeight: 500, width: '40px', textAlign: 'right',
        color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)'
      }}>
        {winPct}%
      </span>
    </div>
  );
}

export function WinRateLegend() {
  const items = [
    { label: 'Win', color: '#1D9E75' },
    { label: 'Draw', color: '#BA7517' },
    { label: 'Loss', color: '#E24B4A' },
  ];

  return (
    <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
      {items.map(({ label, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}