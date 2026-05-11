import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    chessComUsername: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register(
        form.username,
        form.password,
        form.chessComUsername
      );
      const { token, username, chessComUsername } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      localStorage.setItem('chessComUsername', chessComUsername);

      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Try again.';
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
          <span className="auth-logo-text">Chess Insights</span>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Link your Chess.com profile to get started</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Username
            <input
              type="text"
              className="auth-input"
              value={form.username}
              onChange={update('username')}
              placeholder="Choose a username"
              required
              autoFocus
              autoComplete="username"
            />
          </label>

          <label className="auth-label">
            Chess.com Username
            <input
              type="text"
              className="auth-input"
              value={form.chessComUsername}
              onChange={update('chessComUsername')}
              placeholder="Your Chess.com username"
              required
            />
            <span className="auth-hint">
              We'll verify this exists on Chess.com and sync your games
            </span>
          </label>

          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              value={form.password}
              onChange={update('password')}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </label>

          <label className="auth-label">
            Confirm Password
            <input
              type="password"
              className="auth-input"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || !form.username || !form.password || !form.chessComUsername}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}