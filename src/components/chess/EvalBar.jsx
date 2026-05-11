import React from 'react';

/**
 * Vertical evaluation bar that shows the engine's assessment.
 * White advantage fills from bottom, black from top.
 *
 * Props:
 *   evaluation: { score: number, type: 'cp' | 'mate', depth: number }
 *   orientation: 'white' | 'black' — flips the bar
 *   height: number (px, default 440)
 */
export default function EvalBar({ evaluation, orientation = 'white', height = 440 }) {
  let whitePercent = 50;
  let displayText = '0.0';

  if (evaluation) {
    if (evaluation.type === 'mate') {
      const mateIn = evaluation.score;
      whitePercent = mateIn > 0 ? 100 : 0;
      displayText = `M${Math.abs(mateIn)}`;
    } else {
      // score is in centipawns — convert to pawns
      const cp = evaluation.score / 100;

      // Sigmoid: maps pawn advantage to 0–100 percentage
      // At ±2 pawns it's roughly 85/15, at ±5 it's ~98/2
      whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.6 * cp)) - 1);
      whitePercent = Math.max(2, Math.min(98, whitePercent));

      displayText = cp >= 0 ? `+${cp.toFixed(1)}` : cp.toFixed(1);
    }
  }

  // Flip for black orientation
  const fillPercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  return (
    <div style={styles.container} title={`Eval: ${displayText}`}>
      {/* Score label */}
      <div style={{
        ...styles.label,
        top: fillPercent > 50 ? '6px' : undefined,
        bottom: fillPercent <= 50 ? '6px' : undefined,
        color: fillPercent > 50 ? '#2a2926' : '#f0eeea',
      }}>
        {displayText}
      </div>

      {/* Bar */}
      <div style={{ ...styles.bar, height }}>
        {/* Black portion (top) */}
        <div style={{
          ...styles.blackSide,
          height: `${100 - fillPercent}%`,
        }} />
        {/* White portion (bottom) */}
        <div style={{
          ...styles.whiteSide,
          height: `${fillPercent}%`,
        }} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    width: 30,
    flexShrink: 0,
  },
  bar: {
    width: 26,
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(128, 128, 128, 0.3)',
    position: 'relative',
  },
  blackSide: {
    background: '#2a2926',
    transition: 'height 0.3s ease',
    width: '100%',
  },
  whiteSide: {
    background: '#f0eeea',
    transition: 'height 0.3s ease',
    width: '100%',
  },
  label: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'var(--font-mono, monospace)',
    zIndex: 1,
    textShadow: '0 0 3px rgba(128,128,128,0.5)',
  },
};