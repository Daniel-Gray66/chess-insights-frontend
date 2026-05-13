import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '../../../components/chess/ChessBoard';
import EvalBar from '../../../components/chess/EvalBar';
import useStockfish from '../../../hooks/useStockfish';
import { uciToSan } from '../../../Utils/uciToSan';
import { Undo2, Save, X, Cpu, SkipBack, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

export default function LineBuilder({
  chess,
  moves,
  name,
  onNameChange,
  onMove,
  onUndo,
  onReset,
  onSave,
  onCancel,
  saving,
  orientation,
  annotations,
  onAnnotationChange,
}) {
  // Engine
  const { evaluation, lines: engineLines, isAnalyzing, analyze, stop: stopEngine } =
    useStockfish(20, 4);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);

  // View state: which move index we're looking at
  const [viewIndex, setViewIndex] = useState(-1);
  const isAtEnd = viewIndex === moves.length - 1 || moves.length === 0;

  // Replay chess instance for viewing earlier positions
  const replayChess = useRef(new Chess());

  // Compute the displayed FEN and lastMove based on viewIndex
  const getPositionAt = useCallback((idx) => {
    const rc = replayChess.current;
    rc.reset();
    for (let i = 0; i <= idx && i < moves.length; i++) {
      try { rc.move(moves[i].san); } catch { break; }
    }
    return {
      fen: rc.fen(),
      lastMove: idx >= 0 && idx < moves.length
        ? { from: moves[idx].from, to: moves[idx].to }
        : null,
    };
  }, [moves]);

  // Current display position
  const displayPos = moves.length === 0
    ? { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lastMove: null }
    : getPositionAt(viewIndex);

  const turn = displayPos.fen.split(' ')[1] === 'w' ? 'White' : 'Black';

  // Keep viewIndex at the end when new moves are added
  useEffect(() => {
    setViewIndex(moves.length > 0 ? moves.length - 1 : -1);
  }, [moves.length]);

  // Run engine on displayed position
  useEffect(() => {
    if (analysisEnabled && displayPos.fen) {
      analyze(displayPos.fen);
    }
  }, [displayPos.fen, analysisEnabled, analyze]);

  // Navigation
  const goTo = (idx) => {
    const clamped = Math.max(0, Math.min(idx, moves.length - 1));
    setViewIndex(clamped);
  };

  const handleFirst = () => goTo(0);
  const handlePrev = () => { if (viewIndex > 0) goTo(viewIndex - 1); };
  const handleNext = () => goTo(viewIndex + 1);
  const handleLast = () => goTo(moves.length - 1);

  // Board move — only allow when viewing the latest position
  const handleBoardMove = (moveData) => {
    if (!isAtEnd) return false;
    return onMove(moveData);
  };

  // Engine display
  const formatScore = (l) => {
    if (!l) return '';
    if (l.type === 'mate') return `M${Math.abs(l.score)}`;
    return `${l.score >= 0 ? '+' : ''}${(l.score / 100).toFixed(1)}`;
  };

  const formattedLines = engineLines.map((l) => {
    const sanMoves = uciToSan(displayPos.fen, l.bestLine?.slice(0, 8) || []);
    return { ...l, sanMoves, formattedScore: formatScore(l) };
  });

  const engineArrows = [];
  if (analysisEnabled && engineLines.length > 0) {
    const best = engineLines[0];
    if (best?.bestLine?.[0]?.length >= 4) {
      const uci = best.bestLine[0];
      engineArrows.push([uci.slice(0, 2), uci.slice(2, 4), 'rgba(0, 120, 255, 0.7)']);
    }
    if (engineLines[1]?.bestLine?.[0]?.length >= 4) {
      const uci2 = engineLines[1].bestLine[0];
      engineArrows.push([uci2.slice(0, 2), uci2.slice(2, 4), 'rgba(0, 200, 80, 0.6)']);
    }
  }

  const handleToggleEngine = () => {
    if (analysisEnabled) {
      setAnalysisEnabled(false);
      stopEngine();
    } else {
      setAnalysisEnabled(true);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.key === 'Home') { e.preventDefault(); handleFirst(); }
      if (e.key === 'End') { e.preventDefault(); handleLast(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div className="line-builder">
      <div className="builder-header">
        <h3 className="builder-title">Build a Line</h3>
        <button className="btn-icon" onClick={onCancel} title="Cancel">
          <X size={16} />
        </button>
      </div>

      <div className="builder-status">
        {isAtEnd
          ? `Play moves on the board — ${turn} to move`
          : `Viewing move ${viewIndex + 1} — click ▶▶ to continue building`}
        {moves.length > 0 && <span className="builder-count">{moves.length} moves</span>}
      </div>

      {/* Board area with optional engine */}
      <div className="builder-board-area">
        {analysisEnabled && (
          <EvalBar evaluation={evaluation} orientation={orientation} height={400} />
        )}

        {analysisEnabled && (
          <div className="engine-lines-panel engine-lines-panel--builder">
            <div className="engine-lines-header">
              <button
                className="engine-toggle engine-toggle--active"
                onClick={handleToggleEngine}
                title="Disable engine"
              >
                <Cpu size={13} /> ON
              </button>
              <span className="engine-depth-label">
                d{evaluation?.depth || '—'}
                {isAnalyzing && <span className="engine-analyzing-dot" />}
              </span>
            </div>

            <div className="engine-lines-list">
              {formattedLines.map((l, idx) => (
                <div
                  key={idx}
                  className={`engine-line-row ${idx === 0 ? 'engine-line-row--best' : idx === 1 ? 'engine-line-row--second' : ''}`}
                >
                  <span
                    className={`engine-line-rank ${idx === 0 ? 'rank--blue' : idx === 1 ? 'rank--green' : ''}`}
                  >
                    {idx + 1}
                  </span>
                  <span className="engine-line-score">{l.formattedScore}</span>
                  <span className="engine-line-moves">
                    {l.sanMoves.map((mv, mi) => (
                      <span key={mi} className="engine-line-move">{mv}</span>
                    ))}
                  </span>
                </div>
              ))}
              {formattedLines.length === 0 && (
                <div className="engine-lines-empty">
                  {isAnalyzing ? 'Analyzing…' : 'Waiting…'}
                </div>
              )}
            </div>
          </div>
        )}

        <ChessBoard
          fen={displayPos.fen}
          orientation={orientation}
          interactive={isAtEnd}
          onMove={handleBoardMove}
          size={400}
          lastMove={displayPos.lastMove}
          arrows={engineArrows}
        />
      </div>

      {/* Navigation + controls */}
      <div className="builder-controls">
        <button className="replay-btn" onClick={handleFirst} disabled={moves.length === 0 || viewIndex <= 0} title="Start">
          <SkipBack size={14} />
        </button>
        <button className="replay-btn" onClick={handlePrev} disabled={moves.length === 0 || viewIndex <= 0} title="Previous">
          <ChevronLeft size={16} />
        </button>
        <button className="replay-btn" onClick={handleNext} disabled={isAtEnd} title="Next">
          <ChevronRight size={16} />
        </button>
        <button className="replay-btn" onClick={handleLast} disabled={isAtEnd} title="End">
          <SkipForward size={14} />
        </button>

        <span className="builder-controls-divider" />

        <button
          className="btn btn--ghost btn--small"
          onClick={() => { handleLast(); onUndo(); }}
          disabled={moves.length === 0}
          title="Undo last move"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          className="btn btn--ghost btn--small"
          onClick={() => { onReset(); setViewIndex(-1); }}
          disabled={moves.length === 0}
          title="Reset to starting position"
        >
          Reset
        </button>
        {!analysisEnabled && (
          <button
            className="btn btn--ghost btn--small"
            onClick={handleToggleEngine}
            title="Enable engine"
          >
            <Cpu size={13} /> Engine
          </button>
        )}
      </div>

      {/* Move list with clickable moves */}
      {moves.length > 0 && (
        <div className="builder-moves">
          {moves.map((m, i) => (
            <span
              key={i}
              className={`move-tag ${viewIndex === i ? 'move-tag--active' : ''}`}
              onClick={() => goTo(i)}
            >
              {i % 2 === 0 && (
                <span className="move-num">{Math.floor(i / 2) + 1}.</span>
              )}
              {m.san}
              {annotations[i] && <span className="move-tag-dot" />}
            </span>
          ))}
        </div>
      )}

      {/* Annotation input for viewed move */}
      {moves.length > 0 && viewIndex >= 0 && viewIndex < moves.length && (
        <div className="builder-annotation">
          <label className="builder-annotation-label">
            Note for{' '}
            <strong>
              {viewIndex % 2 === 0
                ? `${Math.floor(viewIndex / 2) + 1}. ${moves[viewIndex].san}`
                : `${Math.floor(viewIndex / 2) + 1}... ${moves[viewIndex].san}`}
            </strong>
          </label>
          <textarea
            className="builder-annotation-input"
            value={annotations[viewIndex] || ''}
            onChange={(e) => onAnnotationChange(viewIndex, e.target.value)}
            placeholder="Why this move? (optional)"
            rows={2}
          />
        </div>
      )}

      <div className="builder-save">
        <input
          type="text"
          className="form-input"
          placeholder="Line name (e.g. Main Line)"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <div className="builder-save-actions">
          <button className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={onSave}
            disabled={saving || moves.length === 0 || !name.trim()}
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Line'}
          </button>
        </div>
      </div>
    </div>
  );
}