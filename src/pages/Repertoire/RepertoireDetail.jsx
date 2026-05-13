import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { repertoireApi } from '../../services/api';
import LineBuilder from './components/LineBuilder';
import LinePreview from './components/LinePreview';
import DeviationsTab from './components/DeviationsTab';
import {
  ArrowLeft, Plus, Trash2, Crosshair, AlertTriangle,
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
  const [builderAnnotations, setBuilderAnnotations] = useState({});
  const [saving, setSaving] = useState(false);

  // Selected line
  const [selectedLine, setSelectedLine] = useState(null);
  const [previewMoveIndex, setPreviewMoveIndex] = useState(0);

  // Deviations
  const [deviations, setDeviations] = useState([]);
  const [deviationsLoading, setDeviationsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  // ── Data loading ──────────────────────────────────────
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

  // Keep selectedLine in sync after repertoire reloads
  useEffect(() => {
    if (selectedLine && repertoire?.lines) {
      const updated = repertoire.lines.find((l) => l.id === selectedLine.id);
      if (updated) setSelectedLine(updated);
    }
  }, [repertoire]);

  // ── Line builder handlers ─────────────────────────────
  const startBuilder = () => {
    const chess = new Chess();
    setBuilderChess(chess);
    setBuilderMoves([]);
    setBuilderName('');
    setBuilderAnnotations({});
    setBuilding(true);
    setSelectedLine(null);
  };

  const cancelBuilder = () => {
    setBuilding(false);
    setBuilderChess(null);
    setBuilderMoves([]);
    setBuilderName('');
    setBuilderAnnotations({});
  };

  const handleBuilderMove = ({ from, to }) => {
    if (!builderChess) return false;
    try {
      const move = builderChess.move({ from, to, promotion: 'q' });
      if (!move) return false;
      setBuilderMoves((prev) => [
        ...prev,
        { san: move.san, from: move.from, to: move.to, fen: builderChess.fen() },
      ]);
      setBuilderChess(Object.create(builderChess));
      return true;
    } catch {
      return false;
    }
  };

  const handleBuilderUndo = () => {
    if (!builderChess || builderMoves.length === 0) return;
    const lastIdx = builderMoves.length - 1;
    builderChess.undo();
    setBuilderMoves((prev) => prev.slice(0, -1));
    // Remove annotation for the undone move
    setBuilderAnnotations((prev) => {
      const next = { ...prev };
      delete next[lastIdx];
      return next;
    });
    setBuilderChess(Object.create(builderChess));
  };

  const handleBuilderReset = () => {
    if (!builderChess) return;
    builderChess.reset();
    setBuilderMoves([]);
    setBuilderAnnotations({});
    setBuilderChess(Object.create(builderChess));
  };

  const handleAnnotationChange = (moveIdx, text) => {
    setBuilderAnnotations((prev) => ({ ...prev, [moveIdx]: text }));
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

    const pgn = builderMoves
      .map((m, i) => {
        const num = Math.floor(i / 2) + 1;
        return i % 2 === 0 ? `${num}. ${m.san}` : m.san;
      })
      .join(' ');

    setSaving(true);
    try {
      // 1. Create the line
      const createRes = await repertoireApi.addLine(id, {
        lineName: builderName.trim(),
        pgn,
      });

      // 2. If we have annotations, fetch the new line to get move IDs, then save annotations
      const hasAnnotations = Object.values(builderAnnotations).some(
        (a) => a && a.trim()
      );

      if (hasAnnotations) {
        // Reload repertoire to get the new line with move IDs
        const repRes = await repertoireApi.get(id);
        const newLine = repRes.data.lines?.find(
          (l) => l.lineName === builderName.trim() || l.name === builderName.trim()
        );

        if (newLine?.moves) {
          // Batch update annotations
          const annotationPromises = Object.entries(builderAnnotations)
            .filter(([_, text]) => text && text.trim())
            .map(([idx, text]) => {
              const move = newLine.moves[parseInt(idx)];
              if (move?.id) {
                return repertoireApi.updateMoveAnnotation(
                  id,
                  newLine.id,
                  move.id,
                  text.trim()
                );
              }
              return null;
            })
            .filter(Boolean);

          await Promise.all(annotationPromises);
        }
      }

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

  // ── Loading / not found states ────────────────────────
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
        <Link to="/repertoire" className="btn btn--ghost">
          Back to list
        </Link>
      </div>
    );
  }

  const lines = repertoire.lines || [];
  const orientation = repertoire.color?.toLowerCase() || 'white';

  // ── Render ────────────────────────────────────────────
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
                      <span className="line-item-name">
                        {line.lineName || line.name}
                      </span>
                      <span className="line-item-moves">
                        {line.moveCount ?? 0} moves
                      </span>
                    </div>
                    <div className="line-item-actions">

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
                annotations={builderAnnotations}
                onAnnotationChange={handleAnnotationChange}
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
                  <p>
                    Select a line to preview, or click "Add Line" to build one on the
                    board
                  </p>
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