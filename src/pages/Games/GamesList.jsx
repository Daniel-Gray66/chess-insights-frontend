import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../../services/api';
import { Swords, Clock, Trophy, ChevronRight, Search, Filter } from 'lucide-react';
import './Games.css';

export default function GamesList() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    timeClass: null,
    result: null,
    opponent: '',
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadGames();
  }, [filters.timeClass, filters.result]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.timeClass) params.timeClass = filters.timeClass;
      if (filters.result) params.result = filters.result;
      if (filters.opponent.trim()) params.opponent = filters.opponent.trim();
      const res = await gamesApi.list(params);
      setGames(res.data);
    } catch (err) {
      console.error('Failed to load games', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadGames();
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const resultClass = (r) => {
    if (r === 'win') return 'result--win';
    if (r === 'loss') return 'result--loss';
    return 'result--draw';
  };

  const resultLabel = (r) => {
    if (r === 'win') return 'W';
    if (r === 'loss') return 'L';
    return 'D';
  };

  const timeClassIcon = (tc) => {
    switch (tc) {
      case 'bullet': return '⚡';
      case 'blitz': return '🔥';
      case 'rapid': return '⏱️';
      case 'daily': return '📅';
      default: return '♟️';
    }
  };

  return (
    <div className="games-page">
      <div className="games-header">
        <div>
          <h1 className="games-title">Games</h1>
          <p className="games-subtitle">{games.length} games loaded</p>
        </div>
      </div>

      {/* Filters */}
      <div className="games-filters">
        <div className="filter-tabs">
          {[null, 'bullet', 'blitz', 'rapid', 'daily'].map((tc) => (
            <button
              key={tc || 'all'}
              className={`filter-tab ${filters.timeClass === tc ? 'filter-tab--active' : ''}`}
              onClick={() => setFilters({ ...filters, timeClass: tc })}
            >
              {tc ? `${timeClassIcon(tc)} ${tc.charAt(0).toUpperCase() + tc.slice(1)}` : 'All'}
            </button>
          ))}
        </div>

        <div className="filter-right">
          <div className="result-filters">
            {[null, 'win', 'loss', 'draw'].map((r) => (
              <button
                key={r || 'all'}
                className={`filter-pill ${filters.result === r ? `filter-pill--active filter-pill--${r || 'all'}` : ''}`}
                onClick={() => setFilters({ ...filters, result: r })}
              >
                {r ? r.charAt(0).toUpperCase() + r.slice(1) + 's' : 'All'}
              </button>
            ))}
          </div>

          <button
            className="btn-icon"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search opponent"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <form className="games-search" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by opponent username…"
            value={filters.opponent}
            onChange={(e) => setFilters({ ...filters, opponent: e.target.value })}
            autoFocus
          />
          <button type="submit" className="btn btn--primary btn--small">Search</button>
        </form>
      )}

      {/* Games list */}
      {loading ? (
        <div className="games-loading">
          <div className="loading-spinner" />
          <span>Loading games…</span>
        </div>
      ) : games.length === 0 ? (
        <div className="games-empty">
          <Swords size={40} strokeWidth={1} />
          <h3>No games found</h3>
          <p>Sync your games from Chess.com or adjust your filters.</p>
        </div>
      ) : (
        <div className="games-table-wrapper">
          <table className="games-table">
            <thead>
              <tr>
                <th className="th-result"></th>
                <th>Opponent</th>
                <th>Rating</th>
                <th>Opening</th>
                <th>Accuracy</th>
                <th>Moves</th>
                <th>Type</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr
                  key={game.id}
                  className="game-row"
                  onClick={() => navigate(`/games/${game.id}`)}
                >
                  <td>
                    <span className={`result-badge ${resultClass(game.result)}`}>
                      {resultLabel(game.result)}
                    </span>
                  </td>
                  <td>
                    <div className="opponent-cell">
                      <span className={`color-indicator color-indicator--${game.userColor}`} />
                      <div>
                        <span className="opponent-name">{game.opponentUsername}</span>
                        <span className="opponent-rating">({game.opponentRating})</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="user-rating">{game.userRating}</span>
                  </td>
                  <td>
                    <span className="opening-name">{game.opening || '—'}</span>
                    {game.ecoCode && <span className="eco-code">{game.ecoCode}</span>}
                  </td>
                  <td>
                    {game.accuracy != null ? (
                      <span className="accuracy-val">{game.accuracy.toFixed(1)}%</span>
                    ) : (
                      <span className="no-data">—</span>
                    )}
                  </td>
                  <td>
                    <span className="move-count">{game.numMoves || '—'}</span>
                  </td>
                  <td>
                    <span className="time-class-badge">
                      {timeClassIcon(game.timeClass)} {game.timeClass}
                    </span>
                  </td>
                  <td>
                    <div className="date-cell">
                      <span className="game-date">{formatDate(game.playedAt)}</span>
                      <span className="game-time">{formatTime(game.playedAt)}</span>
                    </div>
                  </td>
                  <td>
                    <ChevronRight size={14} className="row-arrow" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}