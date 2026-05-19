import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { repertoireApi } from '../../services/api';
import { BookOpen, Plus, Trash2, ChevronRight, Target, Crosshair } from 'lucide-react';
import './RepertoireList.css';
import VisibilityToggle from './VisibilityToggle';
import './VisibilityToggle.css';

export default function RepertoireList() {
  const [repertoires, setRepertoires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterColor, setFilterColor] = useState(null);
  const [form, setForm] = useState({ name: '', color: 'WHITE', description: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadRepertoires();
  }, [filterColor]);

  const loadRepertoires = async () => {
    try {
      const res = await repertoireApi.list(filterColor);
      setRepertoires(res.data);
    } catch (err) {
      console.error('Failed to load repertoires', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await repertoireApi.create(form);
      setForm({ name: '', color: 'WHITE', description: '' });
      setShowCreate(false);
      loadRepertoires();
    } catch (err) {
      console.error('Failed to create repertoire', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This removes all lines and drill history.`)) return;
    try {
      await repertoireApi.delete(id);
      loadRepertoires();
    } catch (err) {
      console.error('Failed to delete repertoire', err);
    }
  };

  if (loading) {
    return (
      <div className="rep-loading">
        <div className="loading-spinner" />
        <span>Loading repertoires…</span>
      </div>
    );
  }

  return (
    <div className="rep-list-page">
      <div className="rep-list-header">
        <div>
          <h1 className="rep-list-title">Repertoire</h1>
          <p className="rep-list-subtitle">Build and drill your opening preparation</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Repertoire
        </button>
      </div>

      {/* Color filter tabs */}
      <div className="rep-color-tabs">
        <button
          className={`color-tab ${filterColor === null ? 'color-tab--active' : ''}`}
          onClick={() => setFilterColor(null)}
        >
          All
        </button>
        <button
          className={`color-tab ${filterColor === 'WHITE' ? 'color-tab--active' : ''}`}
          onClick={() => setFilterColor('WHITE')}
        >
          <span className="color-dot color-dot--white" /> White
        </button>
        <button
          className={`color-tab ${filterColor === 'BLACK' ? 'color-tab--active' : ''}`}
          onClick={() => setFilterColor('BLACK')}
        >
          <span className="color-dot color-dot--black" /> Black
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">New Repertoire</h2>
            <form onSubmit={handleCreate} className="create-form">
              <label className="form-label">
                Name
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Chigorin QGD"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </label>
              <label className="form-label">
                Color
                <div className="color-select">
                  <button
                    type="button"
                    className={`color-option ${form.color === 'WHITE' ? 'color-option--selected' : ''}`}
                    onClick={() => setForm({ ...form, color: 'WHITE' })}
                  >
                    <span className="color-dot color-dot--white" /> White
                  </button>
                  <button
                    type="button"
                    className={`color-option ${form.color === 'BLACK' ? 'color-option--selected' : ''}`}
                    onClick={() => setForm({ ...form, color: 'BLACK' })}
                  >
                    <span className="color-dot color-dot--black" /> Black
                  </button>
                </div>
              </label>
              <label className="form-label">
                Description (optional)
                <textarea
                  className="form-input form-textarea"
                  placeholder="Notes about this repertoire…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repertoire cards */}
      {repertoires.length === 0 ? (
        <div className="rep-empty">
          <BookOpen size={48} strokeWidth={1} />
          <h3>No repertoires yet</h3>
          <p>Create your first opening repertoire to start drilling</p>
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Repertoire
          </button>
        </div>
      ) : (
        <div className="rep-card-grid">
          {repertoires.map((rep) => (
            <div key={rep.id} className="rep-card" onClick={() => navigate(`/repertoire/${rep.id}`)}>
              <div className="rep-card-top">
                <div className="rep-card-color">
                  <span className={`color-dot color-dot--${rep.color?.toLowerCase()}`} />
                  {rep.color}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <VisibilityToggle
                    repertoireId={rep.id}
                    currentVisibility={rep.visibility || 'PRIVATE'}
                    onUpdate={() => loadRepertoires()}
                  />
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(rep.id, rep.name);
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="rep-card-name">{rep.name}</h3>
              {rep.description && <p className="rep-card-desc">{rep.description}</p>}
              <div className="rep-card-stats">
                <span className="rep-card-stat">
                  <BookOpen size={13} /> {rep.lineCount ?? 0} lines
                </span>
                {rep.accuracy != null && (
                  <span className="rep-card-stat">
                    <Target size={13} /> {rep.accuracy}% accuracy
                  </span>
                )}
              </div>
              <div className="rep-card-actions">
                <button
                  className="btn btn--small btn--accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/repertoire/${rep.id}/drill`);
                  }}
                >
                  <Crosshair size={13} /> Drill
                </button>
                <ChevronRight size={16} className="rep-card-arrow" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}