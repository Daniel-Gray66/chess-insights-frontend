import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { repertoireApi } from '../../services/api';
import ChessBoard from '../../components/chess/ChessBoard';
import EvalBar from '../../components/chess/EvalBar';
import useStockfish from '../../hooks/useStockfish';
import { uciToSan } from '../../Utils/uciToSan';
import {
  ArrowLeft, Plus, Trash2, Crosshair, AlertTriangle,
  ChevronDown, ChevronUp, Copy, Check, Undo2, Save, X,
  SkipBack, ChevronLeft, ChevronRight, SkipForward,
  GitBranch, RotateCcw, Cpu, BookOpen, Eye, Edit3
} from 'lucide-react';
import './RepertoireDetail.css';

/**
 * Parse a PGN string into an array of move objects using chess.js.
 * Used only for the line builder (API lines use the moves array directly).
 */
function parsePgn(pgn) {
  if (!pgn) return [];
  const chess = new Chess();
  const moveText = pgn
    .replace(/\[.*?\]\s*/g, '').replace(/\{.*?\}/g, '').replace(/\d+\.\.\./g, '')
    .replace(/\d+\.\s*/g, '').replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    .replace(/\s+/g, ' ').trim();

  const tokens = moveText.split(' ').filter(Boolean);
  const moves = [];
  for (const token of tokens) {
    try {
      const move = chess.move(token);
      if (move) moves.push({ san: move.san, from: move.from, to: move.to, fen: chess.fen() });
    } catch { break; }
  }
  return moves;
}

export default function RepertoireDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repertoire, setRepertoire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('lines');

  // Line builder state
  const [building, setBuilding] = useState(false);
  const [builderChess, setBuilderChess] = useState(null);
  const [builderMoves, setBuilderMoves] = useState([]);
  const [builderName, setBuilderName] = useState('');
  const [saving, setSaving] = useState(false);

  // Selected line for board preview
  const [selectedLine, setSelectedLine] = useState(null);
  const [previewMoveIndex, setPreviewMoveIndex] = useState(0);

  // Deviations
  const [deviations, setDeviations] = useState([]);
  const [deviationsLoading, setDeviationsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const loadRepertoire = useCallback(async () => {
    try {
      const res = await repertoireApi.get(id);
      setRepertoire(res.data);
    } catch (err) {
      console.error('Failed to load repertoire', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDeviations = useCallback(async () => {
    setDeviationsLoading(true);
    try {
      const [devRes, accRes] = await Promise.all([
        repertoireApi.getDeviations(id),
        repertoireApi.getAccuracy(id),
      ]);
      setDeviations(devRes.data);
      setAccuracy(accRes.data);
    } catch (err) {
      console.error('Failed to load deviations', err);
    } finally {
      setDeviationsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRepertoire();
  }, [loadRepertoire]);

  useEffect(() => {
    if (tab === 'deviations' && deviations.length === 0) {
      loadDeviations();
    }
  }, [tab, deviations.length, loadDeviations]);

  // When repertoire reloads, update selectedLine reference
  useEffect(() => {
    if (selectedLine && repertoire?.lines) {
      const updated = repertoire.lines.find(l => l.id === selectedLine.id);
      if (updated) setSelectedLine(updated);
    }
  }, [repertoire]);

  // ── Line Builder ──────────────────────────────────────
  const startBuilder = () => {
    const chess = new Chess();
    setBuilderChess(chess);
    setBuilderMoves([]);
    setBuilderName('');
    setBuilding(true);
    setSelectedLine(null);
  };

  const cancelBuilder = () => {
    setBuilding(false);
    setBuilderChess(null);
    setBuilderMoves([]);
    setBuilderName('');
  };

  const handleBuilderMove = ({ from, to }) => {
    if (!builderChess) return false;
    try {
      const move = builderChess.move({ from, to, promotion: 'q' });
      if (!move) return false;
      setBuilderMoves(prev => [...prev, {
        san: move.san,
        from: move.from,
        to: move.to,
        fen: builderChess.fen(),
      }]);
      setBuilderChess(Object.create(builderChess));
      return true;
    } catch {
      return false;
    }
  };

  const handleBuilderUndo = () => {
    if (!builderChess || builderMoves.length === 0) return;
    builderChess.undo();
    setBuilderMoves(prev => prev.slice(0, -1));
    setBuilderChess(Object.create(builderChess));
  };

  const handleBuilderReset = () => {
    if (!builderChess) return;
    builderChess.reset();
    setBuilderMoves([]);
    setBuilderChess(Object.create(builderChess));
  };

  const handleSaveLine = async () => {
    if (builderMoves.length === 0) {
      alert('Play at least one move before saving.');
      return;
    }
    if (!builderName.trim()) {
      alert('Give this line a name.');
      return;
    }

    const pgn = builderMoves.map((m, i) => {
      const num = Math.floor(i / 2) + 1;
      return i % 2 === 0 ? `${num}. ${m.san}` : m.san;
    }).join(' ');

    setSaving(true);
    try {
      await repertoireApi.addLine(id, { lineName: builderName.trim(), pgn });
      cancelBuilder();
      loadRepertoire();
    } catch (err) {
      console.error('Failed to save line', err);
      alert(err.response?.data?.message || 'Error saving line');
    } finally {
      setSaving(false);
    }
  };

  // ── Other handlers ────────────────────────────────────
  const handleDeleteLine = async (lineId, lineName) => {
    if (!window.confirm(`Delete line "${lineName}"?`)) return;
    try {
      await repertoireApi.deleteLine(id, lineId);
      if (selectedLine?.id === lineId) setSelectedLine(null);
      loadRepertoire();
    } catch (err) {
      console.error('Failed to delete line', err);
    }
  };

  const selectLine = (line) => {
    if (building) return;
    setSelectedLine(line);
    setPreviewMoveIndex(0);
  };

  if (loading) {
    return (
      <div className="rep-loading">
        <div className="loading-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!repertoire) {
    return (
      <div className="rep-loading">
        <p>Repertoire not found</p>
        <Link to="/repertoire" className="btn btn--ghost">Back to list</Link>
      </div>
    );
  }

  const lines = repertoire.lines || [];
  const orientation = repertoire.color?.toLowerCase() || 'white';

  return (
    <div className="rep-detail-page">
      {/* Header */}
      <div className="rep-detail-header">
        <button className="btn btn--ghost" onClick={() => navigate('/repertoire')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rep-detail-info">
          <div className="rep-detail-color">
            <span className={`color-dot color-dot--${orientation}`} />
            {repertoire.color}
          </div>
          <h1 className="rep-detail-title">{repertoire.name}</h1>
          {repertoire.description && (
            <p className="rep-detail-desc">{repertoire.description}</p>
          )}
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate(`/repertoire/${id}/drill`)}
          disabled={lines.length === 0}
        >
          <Crosshair size={14} /> Start Drill
        </button>
      </div>

      {/* Tabs */}
      <div className="rep-tabs">
        <button
          className={`rep-tab ${tab === 'lines' ? 'rep-tab--active' : ''}`}
          onClick={() => setTab('lines')}
        >
          Lines ({lines.length})
        </button>
        <button
          className={`rep-tab ${tab === 'deviations' ? 'rep-tab--active' : ''}`}
          onClick={() => setTab('deviations')}
        >
          <AlertTriangle size={13} /> Deviations
        </button>
      </div>

      {/* Content */}
      {tab === 'lines' ? (
        <div className="rep-lines-layout">
          {/* Left: line list */}
          <div className="rep-lines-panel">
            <div className="lines-panel-header">
              <h3 className="lines-panel-title">Lines</h3>
              {!building && (
                <button className="btn btn--small btn--accent" onClick={startBuilder}>
                  <Plus size={13} /> Add Line
                </button>
              )}
            </div>

            {lines.length === 0 && !building ? (
              <div className="lines-empty">
                <p>No lines yet. Click "Add Line" and play your moves on the board.</p>
              </div>
            ) : (
              <div className="lines-list">
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className={`line-item ${selectedLine?.id === line.id ? 'line-item--selected' : ''} ${building ? 'line-item--disabled' : ''}`}
                    onClick={() => selectLine(line)}
                  >
                    <div className="line-item-info">
                      <span className="line-item-name">{line.lineName || line.name}</span>
                      <span className="line-item-moves">
                        {line.moveCount ?? 0} moves
                      </span>
                    </div>
                    <div className="line-item-actions">
                      {line.drillPriority != null && (
                        <span className="line-priority" title="Drill priority">
                          P{line.drillPriority}
                        </span>
                      )}
                      <button
                        className="btn-icon btn-icon--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLine(line.id, line.lineName || line.name);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: board area */}
          <div className="rep-board-panel">
            {building ? (
              <LineBuilder
                chess={builderChess}
                moves={builderMoves}
                name={builderName}
                onNameChange={setBuilderName}
                onMove={handleBuilderMove}
                onUndo={handleBuilderUndo}
                onReset={handleBuilderReset}
                onSave={handleSaveLine}
                onCancel={cancelBuilder}
                saving={saving}
                orientation={orientation}
              />
            ) : selectedLine ? (
              <LinePreview
                line={selectedLine}
                repertoireId={id}
                moveIndex={previewMoveIndex}
                onMoveChange={setPreviewMoveIndex}
                orientation={orientation}
                onAnnotationSaved={loadRepertoire}
              />
            ) : (
              <div className="board-placeholder">
                <div className="board-placeholder-content">
                  <Plus size={32} strokeWidth={1} />
                  <p>Select a line to preview, or click "Add Line" to build one on the board</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <DeviationsTab
          deviations={deviations}
          accuracy={accuracy}
          loading={deviationsLoading}
          color={repertoire.color}
        />
      )}
    </div>
  );
}

/* ── Line Builder (interactive board) ────────────────── */
function LineBuilder({ chess, moves, name, onNameChange, onMove, onUndo, onReset, onSave, onCancel, saving, orientation }) {
  const currentFen = chess ? chess.fen() : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const lastMove = moves.length > 0 ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null;
  const turn = chess && chess.turn() === 'w' ? 'White' : 'Black';

  return (
    <div className="line-builder">
      <div className="builder-header">
        <h3 className="builder-title">Build a Line</h3>
        <button className="btn-icon" onClick={onCancel} title="Cancel">
          <X size={16} />
        </button>
      </div>

      <div className="builder-status">
        Play moves on the board — {turn} to move
        {moves.length > 0 && <span className="builder-count">{moves.length} moves</span>}
      </div>

      <ChessBoard
        fen={currentFen}
        orientation={orientation}
        interactive={true}
        onMove={onMove}
        size={400}
        lastMove={lastMove}
      />

      <div className="builder-controls">
        <button className="btn btn--ghost btn--small" onClick={onUndo} disabled={moves.length === 0} title="Undo last move">
          <Undo2 size={14} /> Undo
        </button>
        <button className="btn btn--ghost btn--small" onClick={onReset} disabled={moves.length === 0} title="Reset to starting position">
          Reset
        </button>
      </div>

      {moves.length > 0 && (
        <div className="builder-moves">
          {moves.map((m, i) => (
            <span key={i} className="move-tag">
              {i % 2 === 0 && <span className="move-num">{Math.floor(i / 2) + 1}.</span>}
              {m.san}
            </span>
          ))}
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
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary" onClick={onSave} disabled={saving || moves.length === 0 || !name.trim()}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Line'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Line Preview with Engine Analysis + Branching + Learn Mode ── */
function LinePreview({ line, repertoireId, moveIndex, onMoveChange, orientation, onAnnotationSaved }) {
  // Use the structured moves array from API, with FEN from each move
  const moves = useMemo(() => {
    if (line.moves && line.moves.length > 0) {
      return line.moves.map(m => ({
        id: m.id,
        san: m.moveSan,
        from: m.moveUci?.slice(0, 2),
        to: m.moveUci?.slice(2, 4),
        fen: m.fenAfter,
        annotation: m.annotation,
      }));
    }
    // Fallback to PGN parsing if moves array missing
    return parsePgn(line.pgn);
  }, [line.moves, line.pgn]);

  const [copied, setCopied] = useState(false);

  // Mode: 'preview' or 'learn'
  const [mode, setMode] = useState('preview');

  // Fade state for smooth transitions
  const [fading, setFading] = useState(false);

  // Chess instance for replaying moves
  const chessRef = useRef(new Chess());

  // Branching state (preview mode only)
  const [isBranching, setIsBranching] = useState(false);
  const [branchMoves, setBranchMoves] = useState([]);
  const [branchStartIndex, setBranchStartIndex] = useState(-1);

  // Engine
  const { evaluation, lines: engineLines, isAnalyzing, analyze, stop: stopEngine } = useStockfish(20, 4);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);

  // Current position
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState(null);

  // Learn mode annotation editing
  const [editingAnnotation, setEditingAnnotation] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState('');
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  // Navigate to a specific move index (-1 = start position)
  const goToMove = useCallback((idx) => {
    if (isBranching) return;
    const chess = chessRef.current;
    chess.reset();

    for (let i = 0; i <= idx && i < moves.length; i++) {
      try { chess.move(moves[i].san); } catch { break; }
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

    // Reset annotation editing when navigating
    setEditingAnnotation(false);
  }, [moves, isBranching, onMoveChange]);

  // Initialize / reset when line changes — with fade transition
  useEffect(() => {
    setFading(true);

    const timer = setTimeout(() => {
      setIsBranching(false);
      setBranchMoves([]);
      setBranchStartIndex(-1);
      setMode('preview');
      setEditingAnnotation(false);
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
    if (analysisEnabled && fen && mode === 'preview') {
      analyze(fen);
    }
  }, [fen, analysisEnabled, analyze, mode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (editingAnnotation) return; // Don't intercept when typing
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.key === 'Home') { e.preventDefault(); handleFirst(); }
      if (e.key === 'End') { e.preventDefault(); handleLast(); }
      if (e.key === 'Escape' && isBranching) { e.preventDefault(); exitBranch(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleFirst = () => { if (moves.length > 0) goToMove(0); };
  const handlePrev = () => {
    if (isBranching) {
      if (branchMoves.length > 0) {
        chessRef.current.undo();
        setBranchMoves(prev => prev.slice(0, -1));
        setFen(chessRef.current.fen());
        const prevBm = branchMoves.length > 1 ? branchMoves[branchMoves.length - 2] : null;
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
  const handleLast = () => { if (moves.length > 0) goToMove(moves.length - 1); };

  // Handle board moves → branching (preview mode only)
  const handleBoardMove = ({ from, to }) => {
    if (mode === 'learn') return false; // Board not interactive in learn mode
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
        setBranchMoves([{ san: move.san, from: move.from, to: move.to, fen: chess.fen() }]);
      } else {
        setBranchMoves(prev => [...prev, { san: move.san, from: move.from, to: move.to, fen: chess.fen() }]);
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

  // Switch modes
  const switchMode = (newMode) => {
    if (newMode === mode) return;
    if (isBranching) exitBranch();
    setMode(newMode);
    setEditingAnnotation(false);
    if (newMode === 'learn') {
      setAnalysisEnabled(false);
      stopEngine();
      goToMove(0);
    }
  };

  // ── Annotation save ──
  const handleSaveAnnotation = async () => {
    const currentMove = moves[moveIndex];
    if (!currentMove?.id) return;

    setSavingAnnotation(true);
    try {
      await repertoireApi.updateMoveAnnotation(
        repertoireId,
        line.id,
        currentMove.id,
        annotationDraft.trim() || null
      );
      // Update local state
      currentMove.annotation = annotationDraft.trim() || null;
      setEditingAnnotation(false);
      if (onAnnotationSaved) onAnnotationSaved();
    } catch (err) {
      console.error('Failed to save annotation', err);
      alert('Error saving annotation');
    } finally {
      setSavingAnnotation(false);
    }
  };

  const startEditAnnotation = () => {
    const currentMove = moves[moveIndex];
    setAnnotationDraft(currentMove?.annotation || '');
    setEditingAnnotation(true);
  };

  // Engine display helpers
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
  if (analysisEnabled && mode === 'preview' && engineLines.length > 0) {
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

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(line.pgn || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMoveData = moveIndex >= 0 && moveIndex < moves.length ? moves[moveIndex] : null;
  const moveLabel = currentMoveData
    ? `${Math.floor(moveIndex / 2) + 1}.${moveIndex % 2 === 0 ? '' : '..'} ${currentMoveData.san}`
    : 'Start';

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
          <span>Exploring what-if — {branchMoves.length} move{branchMoves.length !== 1 ? 's' : ''} deep</span>
          <button className="btn btn--small btn--ghost" onClick={exitBranch}>
            <RotateCcw size={12} /> Back to line
          </button>
        </div>
      )}

      {/* Board area */}
      <div className="line-preview-board-area">
        {mode === 'preview' && analysisEnabled && (
          <EvalBar evaluation={evaluation} orientation={orientation} height={400} />
        )}

        {mode === 'preview' && !analysisEnabled && (
          <button
            className="engine-toggle engine-toggle--off"
            onClick={() => setAnalysisEnabled(true)}
            title="Enable engine"
          >
            <Cpu size={13} /> OFF
          </button>
        )}

        {mode === 'preview' && analysisEnabled && (
          <div className="engine-lines-panel engine-lines-panel--rep">
            <div className="engine-lines-header">
              <button
                className="engine-toggle engine-toggle--active"
                onClick={() => { setAnalysisEnabled(false); stopEngine(); }}
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
                  <span className={`engine-line-rank ${idx === 0 ? 'rank--blue' : idx === 1 ? 'rank--green' : ''}`}>
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

        {/* Learn mode: annotation panel sits left of board */}
        {mode === 'learn' && (
          <div className="learn-panel">
            <div className="learn-panel-header">
              <BookOpen size={14} />
              <span>Move Explanation</span>
            </div>

            <div className="learn-move-label">{moveLabel}</div>

            {editingAnnotation ? (
              <div className="learn-annotation-edit">
                <textarea
                  className="learn-annotation-input"
                  value={annotationDraft}
                  onChange={(e) => setAnnotationDraft(e.target.value)}
                  placeholder="Why this move? e.g. 'Controls the center and opens the diagonal for the bishop'"
                  rows={4}
                  autoFocus
                />
                <div className="learn-annotation-actions">
                  <button
                    className="btn btn--ghost btn--small"
                    onClick={() => setEditingAnnotation(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn--primary btn--small"
                    onClick={handleSaveAnnotation}
                    disabled={savingAnnotation}
                  >
                    <Save size={12} /> {savingAnnotation ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="learn-annotation-display">
                {currentMoveData?.annotation ? (
                  <p className="learn-annotation-text">{currentMoveData.annotation}</p>
                ) : (
                  <p className="learn-annotation-empty">No explanation yet for this move.</p>
                )}
                <button
                  className="btn btn--ghost btn--small learn-edit-btn"
                  onClick={startEditAnnotation}
                >
                  <Edit3 size={12} /> {currentMoveData?.annotation ? 'Edit' : 'Add explanation'}
                </button>
              </div>
            )}

            <div className="learn-progress">
              <div className="learn-progress-bar">
                <div
                  className="learn-progress-fill"
                  style={{ width: `${moves.length > 0 ? ((moveIndex + 1) / moves.length) * 100 : 0}%` }}
                />
              </div>
              <span className="learn-progress-label">
                {moveIndex + 1} / {moves.length}
              </span>
            </div>
          </div>
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
        <button className="replay-btn" onClick={handleFirst} disabled={isBranching || moveIndex <= 0} title="Start"><SkipBack size={16} /></button>
        <button className="replay-btn" onClick={handlePrev} title="Previous (←)"><ChevronLeft size={18} /></button>
        <button className="replay-btn" onClick={handleNext} disabled={isBranching || moveIndex >= moves.length - 1} title="Next (→)"><ChevronRight size={18} /></button>
        <button className="replay-btn" onClick={handleLast} disabled={isBranching || moveIndex >= moves.length - 1} title="End"><SkipForward size={16} /></button>
      </div>

      {/* Branch moves (preview only) */}
      {mode === 'preview' && isBranching && branchMoves.length > 0 && (
        <div className="branch-moves-card">
          <div className="branch-moves-header"><GitBranch size={13} /><span>Your line</span></div>
          <div className="branch-moves-list">
            {branchMoves.map((m, i) => (<span key={i} className="move-tag move-tag--branch">{m.san}</span>))}
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
              onClick={() => { if (isBranching) exitBranch(); goToMove(i); }}
            >
              {i % 2 === 0 && <span className="move-num">{Math.floor(i / 2) + 1}.</span>}
              {m.san}
              {mode === 'learn' && m.annotation && <span className="move-tag-dot" />}
            </span>
          ))}
        </div>
      )}

      <div className="shortcuts-hint">
        {mode === 'preview' ? (
          <>← → navigate • Click board to explore alternatives{isBranching && ' • Esc exit branch'}</>
        ) : (
          <>← → step through moves • Click a move to jump • Edit to add explanations</>
        )}
      </div>
    </div>
  );
}

/* ── Deviations Tab ──────────────────────────────────── */
function DeviationsTab({ deviations, accuracy, loading, color }) {
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
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-default, var(--border-light))" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="var(--accent)" strokeWidth="6"
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
              You played your prepared moves in {accuracy.overallAccuracy ?? 0}% of matching positions
              across {accuracy.totalPrepMoves ?? 0} prep moves analyzed.
            </p>
          </div>
        </div>
      )}

      {deviations.length === 0 ? (
        <div className="lines-empty">
          <AlertTriangle size={24} />
          <p>No deviations found — either your games haven't been synced yet, or you played all your prep perfectly.</p>
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
                    Move {dev.deviationAtMove}: played <strong>{dev.actualMove}</strong>, prep was{' '}
                    <strong>{dev.expectedMove}</strong>
                  </span>
                  {dev.result && (
                    <span className={`pill pill--${dev.result.toLowerCase()}`}>{dev.result}</span>
                  )}
                </div>
                {expanded === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}