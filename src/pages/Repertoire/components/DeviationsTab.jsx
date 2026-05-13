import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function DeviationsTab({ deviations, accuracy, loading, color }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="rep-loading" style={{ height: '40vh' }}>
        <div className="loading-spinner" />
        <span>Analyzing your games…</span>
      </div>
    );
  }

  return (
    <div className="deviations-section">
      {accuracy && (
        <div className="accuracy-card">
          <div className="accuracy-ring">
            <svg viewBox="0 0 100 100" className="accuracy-svg">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--border-default, var(--border-light))"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeDasharray={`${(accuracy.overallAccuracy || 0) * 2.64} 264`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <span className="accuracy-value">{accuracy.overallAccuracy ?? 0}%</span>
          </div>
          <div className="accuracy-info">
            <h3>Repertoire Accuracy</h3>
            <p>
              You played your prepared moves in {accuracy.overallAccuracy ?? 0}% of
              matching positions across {accuracy.totalPrepMoves ?? 0} prep moves
              analyzed.
            </p>
          </div>
        </div>
      )}

      {deviations.length === 0 ? (
        <div className="lines-empty">
          <AlertTriangle size={24} />
          <p>
            No deviations found — either your games haven't been synced yet, or you
            played all your prep perfectly.
          </p>
        </div>
      ) : (
        <div className="deviations-list">
          <h3 className="deviations-title">Recent Deviations</h3>
          {deviations.map((dev, i) => (
            <div key={i} className="deviation-item">
              <div
                className="deviation-header"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="deviation-info">
                  <span className="deviation-opponent">vs {dev.opponent}</span>
                  <span className="deviation-date">{dev.playedAt}</span>
                </div>
                <div className="deviation-detail">
                  <span className="deviation-move">
                    Move {dev.deviationAtMove}: played{' '}
                    <strong>{dev.actualMove}</strong>, prep was{' '}
                    <strong>{dev.expectedMove}</strong>
                  </span>
                  {dev.result && (
                    <span className={`pill pill--${dev.result.toLowerCase()}`}>
                      {dev.result}
                    </span>
                  )}
                </div>
                {expanded === i ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
