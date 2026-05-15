import React, { useState } from 'react';
import api from '../../services/api';
import './Auth.css';

export default function AccountSetup({ onSetupComplete }) {
  const [chessComUsername, setChessComUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/v1/auth/setup', {
        chessComUsername: chessComUsername.trim(),
        displayName: displayName.trim() || null,
      });

      if (onSetupComplete) {
        onSetupComplete(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Setup failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">♞</span>
          <span className="auth-logo-text">KlaroChess</span>
        </div>

        <h1 className="auth-title">Link your Chess.com account</h1>
        <p className="auth-subtitle">
          Enter your Chess.com username so we can sync your games and analyze your play.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Chess.com Username
            <input
              type="text"
              className="auth-input"
              value={chessComUsername}
              onChange={(e) => setChessComUsername(e.target.value)}
              placeholder="Your Chess.com username"
              required
              autoFocus
            />
            <span className="auth-hint">
              We'll verify this exists on Chess.com
            </span>
          </label>

          <label className="auth-label">
            Display Name <span className="auth-optional">(optional)</span>
            <input
              type="text"
              className="auth-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be shown in the app"
            />
          </label>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || !chessComUsername.trim()}
          >
            {loading ? 'Linking account…' : 'Link account & get started'}
          </button>
        </form>
      </div>
    </div>
  );
}