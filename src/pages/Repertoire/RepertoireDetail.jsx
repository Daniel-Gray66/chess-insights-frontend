import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { repertoireApi } from '../../services/api';
import ChessBoard from '../../components/chess/ChessBoard';
import {
  ArrowLeft, Plus, Trash2, Crosshair, AlertTriangle,
  ChevronDown, ChevronUp, Copy, Check, Undo2, Save, X
} from 'lucide-react';
import './RepertoireDetail.css';

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
      // Force re-render by creating a new reference
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

    // Convert moves to PGN string
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
    if (building) return; // Don't switch while building
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
                        {line.moveCount ?? line.moves?.length ?? 0} moves
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
                moveIndex={previewMoveIndex}
                onMoveChange={setPreviewMoveIndex}
                orientation={orientation}
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

      {/* Move controls */}
      <div className="builder-controls">
        <button
          className="btn btn--ghost btn--small"
          onClick={onUndo}
          disabled={moves.length === 0}
          title="Undo last move"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          className="btn btn--ghost btn--small"
          onClick={onReset}
          disabled={moves.length === 0}
          title="Reset to starting position"
        >
          Reset
        </button>
      </div>

      {/* Move list */}
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

      {/* Save section */}
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

/* ── Line Preview with Board ─────────────────────────── */
function LinePreview({ line, moveIndex, onMoveChange, orientation }) {
  const moves = line.moves || [];
  const currentFen = moves[moveIndex]?.fenAfter || moves[moveIndex]?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [copied, setCopied] = useState(false);

  const handleCopyPgn = () => {
    const pgn = moves.map((m, i) => {
      const num = Math.floor(i / 2) + 1;
      return i % 2 === 0 ? `${num}. ${m.moveSan || m.san}` : (m.moveSan || m.san);
    }).join(' ');
    navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="line-preview">
      <div className="line-preview-header">
        <h3 className="line-preview-name">{line.lineName || line.name}</h3>
        <button className="btn-icon" onClick={handleCopyPgn} title="Copy PGN">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <ChessBoard
        fen={currentFen}
        orientation={orientation}
        interactive={false}
      />

      {/* Move navigator */}
      {moves.length > 0 && (
        <>
          <div className="move-nav">
            <button
              className="btn btn--ghost btn--small"
              onClick={() => onMoveChange(0)}
              disabled={moveIndex === 0}
            >
              ⟵
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={() => onMoveChange(Math.max(0, moveIndex - 1))}
              disabled={moveIndex === 0}
            >
              ←
            </button>
            <span className="move-counter">
              {moveIndex + 1} / {moves.length}
            </span>
            <button
              className="btn btn--ghost btn--small"
              onClick={() => onMoveChange(Math.min(moves.length - 1, moveIndex + 1))}
              disabled={moveIndex >= moves.length - 1}
            >
              →
            </button>
            <button
              className="btn btn--ghost btn--small"
              onClick={() => onMoveChange(moves.length - 1)}
              disabled={moveIndex >= moves.length - 1}
            >
              ⟶
            </button>
          </div>

          {/* Move list */}
          <div className="move-list">
            {moves.map((m, i) => (
              <span
                key={i}
                className={`move-tag ${i === moveIndex ? 'move-tag--active' : ''}`}
                onClick={() => onMoveChange(i)}
              >
                {i % 2 === 0 && <span className="move-num">{Math.floor(i / 2) + 1}.</span>}
                {m.moveSan || m.san}
              </span>
            ))}
          </div>
        </>
      )}
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