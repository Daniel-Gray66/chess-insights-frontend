import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '../../../components/chess/ChessBoard';
import EvalBar from '../../../components/chess/EvalBar';
import useStockfish from '../../../hooks/useStockfish';
import { uciToSan } from '../../../Utils/uciToSan';
import LearnPanel from './LearnPanel';
import {
  Copy, Check,
  SkipBack, ChevronLeft, ChevronRight, SkipForward,
  GitBranch, RotateCcw, Cpu, BookOpen, Eye,
} from 'lucide-react';

/**
 * Parse a PGN string into an array of move objects using chess.js.
 * Used as a fallback when the API doesn't return a structured moves array.
 */
function parsePgn(pgn) {
  if (!pgn) return [];
  const chess = new Chess();
  const moveText = pgn
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\{.*?\}/g, '')
    .replace(/\d+\.\.\./g, '')
    .replace(/\d+\.\s*/g, '')
    .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = moveText.split(' ').filter(Boolean);
  const moves = [];
  for (const token of tokens) {
    try {
      const move = chess.move(token);
      if (move)
        moves.push({ san: move.san, from: move.from, to: move.to, fen: chess.fen() });
    } catch {
      break;
    }
  }
  return moves;
}

export default function LinePreview({
  line,
  repertoireId,
  moveIndex,
  onMoveChange,
  orientation,
  onAnnotationSaved,
}) {
  // ── Moves ─────────────────────────────────────────────
  const moves = useMemo(() => {
    if (line.moves && line.moves.length > 0) {
      return line.moves.map((m) => ({
        id: m.id,
        san: m.moveSan,
        from: m.moveUci?.slice(0, 2),
        to: m.moveUci?.slice(2, 4),
        fen: m.fenAfter,
        annotation: m.annotation,
      }));
    }
    return parsePgn(line.pgn);
  }, [line.moves, line.pgn]);

  const [copied, setCopied] = useState(false);

  // Mode: 'preview' or 'learn'
  const [mode, setMode] = useState('preview');

  // Fade transition
  const [fading, setFading] = useState(false);

  // Chess instance for replaying moves
  const chessRef = useRef(new Chess());

  // ── Branching (preview mode) ──────────────────────────
  const [isBranching, setIsBranching] = useState(false);
  const [branchMoves, setBranchMoves] = useState([]);
  const [branchStartIndex, setBranchStartIndex] = useState(-1);

  // ── Engine ────────────────────────────────────────────
  const {
    evaluation,
    lines: engineLines,
    isAnalyzing,
    analyze,
    stop: stopEngine,
  } = useStockfish(20, 4);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);

  // ── Position ──────────────────────────────────────────
  const [fen, setFen] = useState(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
  const [lastMove, setLastMove] = useState(null);

  // ── Navigation ────────────────────────────────────────
  const goToMove = useCallback(
    (idx) => {
      if (isBranching) return;
      const chess = chessRef.current;
      chess.reset();

      for (let i = 0; i <= idx && i < moves.length; i++) {
        try {
          chess.move(moves[i].san);
        } catch {
          break;
        }
      }

      onMoveChange(idx);

      if (idx >= 0 && idx < moves.length && moves[idx].fen) {
        setFen(moves[idx].fen);
      } else {
        setFen(chess.fen());
      }

      if (idx >= 0 && idx < moves.length) {
        setLastMove({ from: moves[idx].from, to: moves[idx].to });
      } else {
        setLastMove(null);
      }
    },
    [moves, isBranching, onMoveChange]
  );

  // Initialize / reset when line changes — with fade
  useEffect(() => {
    setFading(true);

    const timer = setTimeout(() => {
      setIsBranching(false);
      setBranchMoves([]);
      setBranchStartIndex(-1);
      setMode('preview');
      chessRef.current.reset();

      if (moves.length > 0) {
        goToMove(0);
      } else {
        setFen(chessRef.current.fen());
        setLastMove(null);
      }

      setFading(false);
    }, 80);

    return () => clearTimeout(timer);
  }, [line.id]);

  // Run engine when FEN changes (preview mode only)
  useEffect(() => {
    if (analysisEnabled && fen) {
      analyze(fen);
    }
  }, [fen, analysisEnabled, analyze, mode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.key === 'Home') { e.preventDefault(); handleFirst(); }
      if (e.key === 'End') { e.preventDefault(); handleLast(); }
      if (e.key === 'Escape' && isBranching) { e.preventDefault(); exitBranch(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleFirst = () => {
    if (moves.length > 0) goToMove(0);
  };
  const handlePrev = () => {
    if (isBranching) {
      if (branchMoves.length > 0) {
        chessRef.current.undo();
        setBranchMoves((prev) => prev.slice(0, -1));
        setFen(chessRef.current.fen());
        const prevBm =
          branchMoves.length > 1 ? branchMoves[branchMoves.length - 2] : null;
        setLastMove(prevBm ? { from: prevBm.from, to: prevBm.to } : null);
      } else {
        exitBranch();
      }
    } else {
      if (moveIndex > 0) goToMove(moveIndex - 1);
    }
  };
  const handleNext = () => {
    if (!isBranching && moveIndex < moves.length - 1) goToMove(moveIndex + 1);
  };
  const handleLast = () => {
    if (moves.length > 0) goToMove(moves.length - 1);
  };

  // ── Board moves → branching (preview only) ────────────
  const handleBoardMove = ({ from, to }) => {
    if (mode === 'learn') return false;
    const chess = chessRef.current;
    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) return false;

      if (!isBranching) {
        const nextMove = moves[moveIndex + 1];
        if (nextMove && move.san === nextMove.san) {
          chess.undo();
          goToMove(moveIndex + 1);
          return true;
        }
        setIsBranching(true);
        setBranchStartIndex(moveIndex);
        setBranchMoves([
          { san: move.san, from: move.from, to: move.to, fen: chess.fen() },
        ]);
      } else {
        setBranchMoves((prev) => [
          ...prev,
          { san: move.san, from: move.from, to: move.to, fen: chess.fen() },
        ]);
      }

      setFen(chess.fen());
      setLastMove({ from: move.from, to: move.to });
      return true;
    } catch {
      return false;
    }
  };

  const exitBranch = () => {
    setIsBranching(false);
    setBranchMoves([]);
    setBranchStartIndex(-1);
    goToMove(moveIndex);
  };

  // ── Mode switching ────────────────────────────────────
  const switchMode = (newMode) => {
    if (newMode === mode) return;
    if (isBranching) exitBranch();
    setMode(newMode);
    if (newMode === 'learn') {
      goToMove(0);
    }
  };

  // ── Engine display helpers ────────────────────────────
  const formatScore = (l) => {
    if (!l) return '';
    if (l.type === 'mate') return `M${Math.abs(l.score)}`;
    return `${l.score >= 0 ? '+' : ''}${(l.score / 100).toFixed(1)}`;
  };

  const formattedLines = engineLines.map((l) => {
    const sanMoves = uciToSan(fen, l.bestLine?.slice(0, 8) || []);
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
      engineArrows.push([
        uci2.slice(0, 2),
        uci2.slice(2, 4),
        'rgba(0, 200, 80, 0.6)',
      ]);
    }
  }

  // ── Misc helpers ──────────────────────────────────────
  const handleCopyPgn = () => {
    navigator.clipboard.writeText(line.pgn || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMoveData =
    moveIndex >= 0 && moveIndex < moves.length ? moves[moveIndex] : null;
  const moveLabel = currentMoveData
    ? `${Math.floor(moveIndex / 2) + 1}.${moveIndex % 2 === 0 ? '' : '..'} ${currentMoveData.san}`
    : 'Start';

  // ── Render ────────────────────────────────────────────
  return (
    <div className={`line-preview ${fading ? 'line-preview--fading' : ''}`}>
      <div className="line-preview-header">
        <h3 className="line-preview-name">{line.lineName || line.name}</h3>
        <div className="line-preview-header-actions">
          <button className="btn-icon" onClick={handleCopyPgn} title="Copy PGN">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="line-mode-tabs">
        <button
          className={`line-mode-tab ${mode === 'preview' ? 'line-mode-tab--active' : ''}`}
          onClick={() => switchMode('preview')}
        >
          <Eye size={13} /> Preview
        </button>
        <button
          className={`line-mode-tab ${mode === 'learn' ? 'line-mode-tab--active' : ''}`}
          onClick={() => switchMode('learn')}
        >
          <BookOpen size={13} /> Learn
        </button>
      </div>

      {/* Branch banner (preview only) */}
      {mode === 'preview' && isBranching && (
        <div className="branch-banner">
          <GitBranch size={14} />
          <span>
            Exploring what-if — {branchMoves.length} move
            {branchMoves.length !== 1 ? 's' : ''} deep
          </span>
          <button className="btn btn--small btn--ghost" onClick={exitBranch}>
            <RotateCcw size={12} /> Back to line
          </button>
        </div>
      )}

      {/* Board area */}
      <div className="line-preview-board-area">
        {analysisEnabled && (
          <EvalBar evaluation={evaluation} orientation={orientation} height={400} />
        )}

        {!analysisEnabled && (
          <button
            className="engine-toggle engine-toggle--off"
            onClick={() => setAnalysisEnabled(true)}
            title="Enable engine"
          >
            <Cpu size={13} /> OFF
          </button>
        )}

        {analysisEnabled && (
          <div className="engine-lines-panel engine-lines-panel--rep">
            <div className="engine-lines-header">
              <button
                className="engine-toggle engine-toggle--active"
                onClick={() => {
                  setAnalysisEnabled(false);
                  stopEngine();
                }}
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
                      <span key={mi} className="engine-line-move">
                        {mv}
                      </span>
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

        {/* Learn mode panel */}
        {mode === 'learn' && (
          <LearnPanel
            currentMove={currentMoveData}
            moveIndex={moveIndex}
            moveLabel={moveLabel}
            totalMoves={moves.length}
            repertoireId={repertoireId}
            lineId={line.id}
            onAnnotationSaved={onAnnotationSaved}
          />
        )}

        <ChessBoard
          fen={fen}
          orientation={orientation}
          interactive={mode === 'preview'}
          onMove={handleBoardMove}
          size={400}
          lastMove={lastMove}
          arrows={engineArrows}
        />
      </div>

      {/* Replay controls */}
      <div className="replay-controls">
        <button
          className="replay-btn"
          onClick={handleFirst}
          disabled={isBranching || moveIndex <= 0}
          title="Start"
        >
          <SkipBack size={16} />
        </button>
        <button className="replay-btn" onClick={handlePrev} title="Previous (←)">
          <ChevronLeft size={18} />
        </button>
        <button
          className="replay-btn"
          onClick={handleNext}
          disabled={isBranching || moveIndex >= moves.length - 1}
          title="Next (→)"
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="replay-btn"
          onClick={handleLast}
          disabled={isBranching || moveIndex >= moves.length - 1}
          title="End"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Branch moves (preview only) */}
      {mode === 'preview' && isBranching && branchMoves.length > 0 && (
        <div className="branch-moves-card">
          <div className="branch-moves-header">
            <GitBranch size={13} />
            <span>Your line</span>
          </div>
          <div className="branch-moves-list">
            {branchMoves.map((m, i) => (
              <span key={i} className="move-tag move-tag--branch">
                {m.san}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Move list */}
      {moves.length > 0 && (
        <div className="move-list">
          {moves.map((m, i) => (
            <span
              key={i}
              className={`move-tag ${i === moveIndex && !isBranching ? 'move-tag--active' : ''} ${branchStartIndex === i ? 'move-tag--branch-point' : ''} ${mode === 'learn' && m.annotation ? 'move-tag--annotated' : ''}`}
              onClick={() => {
                if (isBranching) exitBranch();
                goToMove(i);
              }}
            >
              {i % 2 === 0 && (
                <span className="move-num">{Math.floor(i / 2) + 1}.</span>
              )}
              {m.san}
              {mode === 'learn' && m.annotation && <span className="move-tag-dot" />}
            </span>
          ))}
        </div>
      )}

      <div className="shortcuts-hint">
        {mode === 'preview' ? (
          <>
            ← → navigate • Click board to explore alternatives
            {isBranching && ' • Esc exit branch'}
          </>
        ) : (
          <>← → step through moves • Click a move to jump • Edit to add explanations</>
        )}
      </div>
    </div>
  );
}