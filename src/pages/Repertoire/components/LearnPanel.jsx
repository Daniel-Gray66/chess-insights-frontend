import React from 'react';
import { BookOpen } from 'lucide-react';

export default function LearnPanel({
  currentMove,
  moveIndex,
  moveLabel,
  totalMoves,
}) {
  return (
    <div className="learn-panel">
      <div className="learn-panel-header">
        <BookOpen size={14} />
        <span>Move Explanation</span>
      </div>

      <div className="learn-move-label">{moveLabel}</div>

      <div className="learn-annotation-display">
        {currentMove?.annotation ? (
          <p className="learn-annotation-text">{currentMove.annotation}</p>
        ) : (
          <p className="learn-annotation-empty">No explanation for this move.</p>
        )}
      </div>

      <div className="learn-progress">
        <div className="learn-progress-bar">
          <div
            className="learn-progress-fill"
            style={{
              width: `${totalMoves > 0 ? ((moveIndex + 1) / totalMoves) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="learn-progress-label">
          {moveIndex + 1} / {totalMoves}
        </span>
      </div>
    </div>
  );
}