import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { gamesApi } from '../../services/api';
import ChessBoard from '../../components/chess/ChessBoard';
import EvalBar from '../../components/chess/EvalBar';
import useStockfish from '../../hooks/useStockfish';
import { uciToSan } from '../../Utils/uciToSan';
import {
  ArrowLeft, ExternalLink, SkipBack, ChevronLeft,
  ChevronRight, SkipForward, Play, Pause,
  GitBranch, RotateCcw, Cpu
} from 'lucide-react';
import './Games.css';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  const [gameMoves, setGameMoves] = useState([]);
  const [moveIndex, setMoveIndex] = useState(-1);

  const [isBranching, setIsBranching] = useState(false);
  const [branchMoves, setBranchMoves] = useState([]);
  const [branchStartIndex, setBranchStartIndex] = useState(-1);

  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);

  const { evaluation, lines: engineLines, isAnalyzing, analyze, stop: stopEngine } = useStockfish(20, 4);
  const [analysisEnabled, setAnalysisEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await gamesApi.get(id);
        setGame(res.data);
        if (res.data.pgn) {
          const parsed = parsePgnToMoves(res.data.pgn);
          setGameMoves(parsed);
        }
      } catch (err) {
        console.error('Failed to load game', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (analysisEnabled && fen) {
      analyze(fen);
    }
  }, [fen, analysisEnabled, analyze]);

  const goToMove = useCallback((idx) => {
    if (isBranching) return;
    const chess = chessRef.current;
    chess.reset();
    for (let i = 0; i <= idx && i < gameMoves.length; i++) {
      chess.move(gameMoves[i].san);
    }
    setMoveIndex(idx);
    setFen(chess.fen());
    if (idx >= 0 && idx < gameMoves.length) {
      setLastMove({ from: gameMoves[idx].from, to: gameMoves[idx].to });
    } else {
      setLastMove(null);
    }
  }, [gameMoves, isBranching]);

  const goFirst = () => { goToMove(-1); setAutoPlaying(false); };
  const goPrev = () => {
    if (isBranching) {
      if (branchMoves.length > 0) {
        chessRef.current.undo();
        setBranchMoves(prev => prev.slice(0, -1));
        setFen(chessRef.current.fen());
        const prevBranchMove = branchMoves.length > 1 ? branchMoves[branchMoves.length - 2] : null;
        setLastMove(prevBranchMove ? { from: prevBranchMove.from, to: prevBranchMove.to } : null);
      } else {
        exitBranch();
      }
    } else {
      goToMove(Math.max(-1, moveIndex - 1));
    }
  };
  const goNext = () => { if (!isBranching) goToMove(Math.min(gameMoves.length - 1, moveIndex + 1)); };
  const goLast = () => { goToMove(gameMoves.length - 1); setAutoPlaying(false); };

  const handleBoardMove = ({ from, to }) => {
    const chess = chessRef.current;
    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) return false;

      if (!isBranching) {
        const nextGameMove = gameMoves[moveIndex + 1];
        if (nextGameMove && move.san === nextGameMove.san) {
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

  useEffect(() => {
    if (autoPlaying && !isBranching) {
      autoPlayRef.current = setInterval(() => {
        setMoveIndex((prev) => {
          const next = prev + 1;
          if (next >= gameMoves.length) {
            setAutoPlaying(false);
            clearInterval(autoPlayRef.current);
            return prev;
          }
          goToMove(next);
          return next;
        });
      }, 800);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [autoPlaying, gameMoves.length, goToMove, isBranching]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'Home') { e.preventDefault(); goFirst(); }
      if (e.key === 'End') { e.preventDefault(); goLast(); }
      if (e.key === ' ') { e.preventDefault(); setAutoPlaying((p) => !p); }
      if (e.key === 'Escape' && isBranching) { e.preventDefault(); exitBranch(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (loading) {
    return (
      <div className="games-page"><div className="games-loading"><div className="loading-spinner" /><span>Loading game…</span></div></div>
    );
  }

  if (!game) {
    return (
      <div className="games-page"><div className="games-empty"><p>Game not found</p>
        <button className="btn btn--ghost" onClick={() => navigate('/games')}><ArrowLeft size={16} /> Back to games</button>
      </div></div>
    );
  }

  const orientation = game.userColor || 'white';
  const resultClass = game.result === 'win' ? 'result--win' : game.result === 'loss' ? 'result--loss' : 'result--draw';
  const resultLabel = game.result === 'win' ? 'Victory' : game.result === 'loss' ? 'Defeat' : 'Draw';

  const evalDisplay = evaluation ? (
    evaluation.type === 'mate'
      ? `M${Math.abs(evaluation.score)}`
      : `${evaluation.score >= 0 ? '+' : ''}${(evaluation.score / 100).toFixed(1)}`
  ) : null;

  // Build arrows from top engine lines
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

  // Format eval score for display
  const formatScore = (line) => {
    if (!line) return '';
    if (line.type === 'mate') return `M${Math.abs(line.score)}`;
    return `${line.score >= 0 ? '+' : ''}${(line.score / 100).toFixed(1)}`;
  };

  // Convert engine lines UCI to SAN with piece symbols
  const formattedLines = engineLines.map((line) => {
    const sanMoves = uciToSan(fen, line.bestLine?.slice(0, 8) || []);
    return {
      ...line,
      sanMoves,
      formattedScore: formatScore(line),
    };
  });

  return (
    <div className="games-page game-detail">
      <div className="game-detail-header">
        <button className="btn btn--ghost" onClick={() => navigate('/games')}>
          <ArrowLeft size={16} /> Games
        </button>
        <div className="game-detail-info">
          <div className="game-detail-matchup">
            <span className="game-detail-player">You ({game.userRating})</span>
            <span className="game-detail-vs">vs</span>
            <span className="game-detail-opponent">{game.opponentUsername} ({game.opponentRating})</span>
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

      {isBranching && (
        <div className="branch-banner">
          <GitBranch size={14} />
          <span>Exploring alternative from move {Math.floor(branchStartIndex / 2) + 1} — {branchMoves.length} move{branchMoves.length !== 1 ? 's' : ''} deep</span>
          <button className="btn btn--small btn--ghost" onClick={exitBranch}>
            <RotateCcw size={12} /> Back to game
          </button>
        </div>
      )}

      <div className="game-replay-layout">
        {/* Eval bar — thin vertical bar on the far left */}
        {analysisEnabled && (
          <EvalBar evaluation={evaluation} orientation={orientation} height={440} />
        )}

        {/* Engine off — show toggle to re-enable */}
          {!analysisEnabled && (
    <button
            className="engine-toggle engine-toggle--off"
      onClick={() => setAnalysisEnabled(true)}
          title="Enable engine"
    >
            <Cpu size={13} /> OFF
          </button>
              )}

{/* Engine lines panel — sits between eval bar and board */}
{analysisEnabled && (
  <div className="engine-lines-panel">
            <div className="engine-lines-header">
              <button
                className={`engine-toggle ${analysisEnabled ? 'engine-toggle--active' : ''}`}
                onClick={() => { setAnalysisEnabled(prev => !prev); if (analysisEnabled) stopEngine(); }}
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
              {formattedLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`engine-line-row ${idx === 0 ? 'engine-line-row--best' : idx === 1 ? 'engine-line-row--second' : ''}`}
                >
                  <span className={`engine-line-rank ${idx === 0 ? 'rank--blue' : idx === 1 ? 'rank--green' : ''}`}>
                    {idx + 1}
                  </span>
                  <span className="engine-line-score">{line.formattedScore}</span>
                  <span className="engine-line-moves">
                    {line.sanMoves.map((move, mi) => (
                      <span key={mi} className="engine-line-move">{move}</span>
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

        <div className="game-board-area">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            interactive={true}
            onMove={handleBoardMove}
            size={440}
            lastMove={lastMove}
            arrows={engineArrows}
          />

          <div className="replay-controls">
            <button className="replay-btn" onClick={goFirst} disabled={isBranching} title="Start (Home)"><SkipBack size={16} /></button>
            <button className="replay-btn" onClick={goPrev} title="Previous (←)"><ChevronLeft size={18} /></button>
            <button className={`replay-btn replay-btn--play ${autoPlaying ? 'replay-btn--active' : ''}`} onClick={() => setAutoPlaying((p) => !p)} disabled={isBranching} title="Auto-play (Space)">
              {autoPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="replay-btn" onClick={goNext} disabled={isBranching} title="Next (→)"><ChevronRight size={18} /></button>
            <button className="replay-btn" onClick={goLast} disabled={isBranching} title="End (End)"><SkipForward size={16} /></button>
          </div>
        </div>

        <div className="game-side-panel">
          <div className="game-info-card">
            <div className="info-row">
              <span className="info-label">Date</span>
              <span className="info-value">{game.playedAt ? new Date(game.playedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Color</span>
              <span className="info-value"><span className={`color-indicator color-indicator--${game.userColor}`} />{game.userColor?.charAt(0).toUpperCase() + game.userColor?.slice(1)}</span>
            </div>
            {game.accuracy != null && (
              <div className="info-row">
                <span className="info-label">Accuracy</span>
                <span className="info-value accuracy-val">{game.accuracy.toFixed(1)}%</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Moves</span>
              <span className="info-value">{game.numMoves || gameMoves.length}</span>
            </div>
          </div>

          {isBranching && branchMoves.length > 0 && (
            <div className="branch-moves-card">
              <div className="branch-moves-header"><GitBranch size={13} /><span>Your line</span></div>
              <div className="branch-moves-list">
                {branchMoves.map((m, i) => (<span key={i} className="move-tag move-tag--branch">{m.san}</span>))}
              </div>
            </div>
          )}

          <div className="move-sheet">
            <div className="move-sheet-header">
              <span>Move {moveIndex >= 0 ? Math.floor(moveIndex / 2) + 1 : 0} of {Math.ceil(gameMoves.length / 2)}</span>
            </div>
            <div className="move-sheet-body">
              {Array.from({ length: Math.ceil(gameMoves.length / 2) }, (_, i) => {
                const wIdx = i * 2;
                const bIdx = i * 2 + 1;
                return (
                  <div key={i} className="move-sheet-row">
                    <span className="move-sheet-num">{i + 1}.</span>
                    <span
                      className={`move-sheet-move ${moveIndex === wIdx && !isBranching ? 'move-sheet-move--active' : ''} ${branchStartIndex === wIdx ? 'move-sheet-move--branch-point' : ''}`}
                      onClick={() => { if (isBranching) exitBranch(); goToMove(wIdx); }}
                    >{gameMoves[wIdx]?.san}</span>
                    {gameMoves[bIdx] && (
                      <span
                        className={`move-sheet-move ${moveIndex === bIdx && !isBranching ? 'move-sheet-move--active' : ''} ${branchStartIndex === bIdx ? 'move-sheet-move--branch-point' : ''}`}
                        onClick={() => { if (isBranching) exitBranch(); goToMove(bIdx); }}
                      >{gameMoves[bIdx]?.san}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shortcuts-hint">
            ← → navigate • Space auto-play • Click board to explore
            {isBranching && ' • Esc exit branch'}
          </div>
        </div>
      </div>
    </div>
  );
}

function parsePgnToMoves(pgn) {
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