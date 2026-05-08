import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { gamesApi } from '../../services/api';
import ChessBoard from '../../components/chess/ChessBoard';
import {
  ArrowLeft, ExternalLink, SkipBack, ChevronLeft,
  ChevronRight, SkipForward, Play, Pause
} from 'lucide-react';
import './Games.css';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  // Replay state
  const [moves, setMoves] = useState([]);
  const [moveIndex, setMoveIndex] = useState(-1); // -1 = starting position
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);
  const chessRef = useRef(new Chess());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await gamesApi.get(id);
        setGame(res.data);

        // Parse PGN into moves
        if (res.data.pgn) {
          const parsed = parsePgnToMoves(res.data.pgn);
          setMoves(parsed);
        }
      } catch (err) {
        console.error('Failed to load game', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const goToMove = useCallback((idx) => {
    const chess = chessRef.current;
    chess.reset();

    // Replay up to the target move
    for (let i = 0; i <= idx && i < moves.length; i++) {
      chess.move(moves[i].san);
    }

    setMoveIndex(idx);
    setFen(chess.fen());

    if (idx >= 0 && idx < moves.length) {
      setLastMove({ from: moves[idx].from, to: moves[idx].to });
    } else {
      setLastMove(null);
    }
  }, [moves]);

  const goFirst = () => { goToMove(-1); setAutoPlaying(false); };
  const goPrev = () => { goToMove(Math.max(-1, moveIndex - 1)); };
  const goNext = () => { goToMove(Math.min(moves.length - 1, moveIndex + 1)); };
  const goLast = () => { goToMove(moves.length - 1); setAutoPlaying(false); };

  // Auto-play
  useEffect(() => {
    if (autoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setMoveIndex((prev) => {
          const next = prev + 1;
          if (next >= moves.length) {
            setAutoPlaying(false);
            clearInterval(autoPlayRef.current);
            return prev;
          }
          goToMove(next);
          return next;
        });
      }, 800);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlaying, moves.length, goToMove]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'Home') { e.preventDefault(); goFirst(); }
      if (e.key === 'End') { e.preventDefault(); goLast(); }
      if (e.key === ' ') { e.preventDefault(); setAutoPlaying((p) => !p); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (loading) {
    return (
      <div className="games-page">
        <div className="games-loading">
          <div className="loading-spinner" />
          <span>Loading game…</span>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="games-page">
        <div className="games-empty">
          <p>Game not found</p>
          <button className="btn btn--ghost" onClick={() => navigate('/games')}>
            <ArrowLeft size={16} /> Back to games
          </button>
        </div>
      </div>
    );
  }

  const orientation = game.userColor || 'white';
  const resultClass = game.result === 'win' ? 'result--win' : game.result === 'loss' ? 'result--loss' : 'result--draw';
  const resultLabel = game.result === 'win' ? 'Victory' : game.result === 'loss' ? 'Defeat' : 'Draw';

  return (
    <div className="games-page game-detail">
      {/* Header */}
      <div className="game-detail-header">
        <button className="btn btn--ghost" onClick={() => navigate('/games')}>
          <ArrowLeft size={16} /> Games
        </button>
        <div className="game-detail-info">
          <div className="game-detail-matchup">
            <span className="game-detail-player">
              You ({game.userRating})
            </span>
            <span className="game-detail-vs">vs</span>
            <span className="game-detail-opponent">
              {game.opponentUsername} ({game.opponentRating})
            </span>
          </div>
          <div className="game-detail-meta">
            <span className={`result-pill ${resultClass}`}>{resultLabel}</span>
            {game.termination && <span className="meta-tag">{game.termination}</span>}
            <span className="meta-tag">{game.timeClass} • {game.timeControl}</span>
            {game.opening && <span className="meta-tag">{game.opening}</span>}
          </div>
        </div>
        {game.gameUrl && (
          <a href={game.gameUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            <ExternalLink size={14} /> Chess.com
          </a>
        )}
      </div>

      <div className="game-replay-layout">
        {/* Board */}
        <div className="game-board-area">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            interactive={false}
            size={440}
            lastMove={lastMove}
          />

          {/* Navigation controls */}
          <div className="replay-controls">
            <button className="replay-btn" onClick={goFirst} title="Start (Home)">
              <SkipBack size={16} />
            </button>
            <button className="replay-btn" onClick={goPrev} title="Previous (←)">
              <ChevronLeft size={18} />
            </button>
            <button
              className={`replay-btn replay-btn--play ${autoPlaying ? 'replay-btn--active' : ''}`}
              onClick={() => setAutoPlaying((p) => !p)}
              title="Auto-play (Space)"
            >
              {autoPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="replay-btn" onClick={goNext} title="Next (→)">
              <ChevronRight size={18} />
            </button>
            <button className="replay-btn" onClick={goLast} title="End (End)">
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="game-side-panel">
          {/* Game info card */}
          <div className="game-info-card">
            <div className="info-row">
              <span className="info-label">Date</span>
              <span className="info-value">
                {game.playedAt ? new Date(game.playedAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric'
                }) : '—'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Color</span>
              <span className="info-value">
                <span className={`color-indicator color-indicator--${game.userColor}`} />
                {game.userColor?.charAt(0).toUpperCase() + game.userColor?.slice(1)}
              </span>
            </div>
            {game.accuracy != null && (
              <div className="info-row">
                <span className="info-label">Accuracy</span>
                <span className="info-value accuracy-val">{game.accuracy.toFixed(1)}%</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Moves</span>
              <span className="info-value">{game.numMoves || moves.length}</span>
            </div>
            {game.ecoCode && (
              <div className="info-row">
                <span className="info-label">ECO</span>
                <span className="info-value">{game.ecoCode}</span>
              </div>
            )}
          </div>

          {/* Move sheet */}
          <div className="move-sheet">
            <div className="move-sheet-header">
              <span>Move {moveIndex >= 0 ? Math.floor(moveIndex / 2) + 1 : 0} of {Math.ceil(moves.length / 2)}</span>
            </div>
            <div className="move-sheet-body">
              {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
                const wIdx = i * 2;
                const bIdx = i * 2 + 1;
                return (
                  <div key={i} className="move-sheet-row">
                    <span className="move-sheet-num">{i + 1}.</span>
                    <span
                      className={`move-sheet-move ${moveIndex === wIdx ? 'move-sheet-move--active' : ''}`}
                      onClick={() => goToMove(wIdx)}
                    >
                      {moves[wIdx]?.san}
                    </span>
                    {moves[bIdx] && (
                      <span
                        className={`move-sheet-move ${moveIndex === bIdx ? 'move-sheet-move--active' : ''}`}
                        onClick={() => goToMove(bIdx)}
                      >
                        {moves[bIdx]?.san}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PGN Parser ──────────────────────────────────────── */
function parsePgnToMoves(pgn) {
  const chess = new Chess();

  // Strip headers (lines starting with [)
  const moveText = pgn
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\{.*?\}/g, '')       // strip comments
    .replace(/\d+\.\.\./g, '')     // strip "1..."
    .replace(/\d+\.\s*/g, '')      // strip "1. "
    .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '') // strip result
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = moveText.split(' ').filter(Boolean);
  const moves = [];

  for (const token of tokens) {
    try {
      const move = chess.move(token);
      if (move) {
        moves.push({
          san: move.san,
          from: move.from,
          to: move.to,
          fen: chess.fen(),
        });
      }
    } catch {
      break;
    }
  }

  return moves;
}