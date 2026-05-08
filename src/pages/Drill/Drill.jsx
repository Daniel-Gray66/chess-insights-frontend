import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { repertoireApi } from '../../services/api';
import ChessBoard from '../../components/chess/ChessBoard';
import { ArrowLeft, RotateCcw, Check, X, Zap, Target, Trophy, Eye } from 'lucide-react';
import './Drill.css';

export default function DrillPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repertoire, setRepertoire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The full line we're drilling
  const [currentLine, setCurrentLine] = useState(null);
  const [lineMoves, setLineMoves] = useState([]);

  // Board state
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [moveIndex, setMoveIndex] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [highlightSquares, setHighlightSquares] = useState({});
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  // Feedback
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong' | 'complete'
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });

  // Which color the user plays
  const [playerColor, setPlayerColor] = useState('w');

  const loadDrill = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastMove(null);
    setHighlightSquares({});
    setMoveIndex(0);
    setWaitingForOpponent(false);

    try {
      const repRes = await repertoireApi.get(id);
      const rep = repRes.data;
      setRepertoire(rep);
      setPlayerColor(rep.color === 'WHITE' ? 'w' : 'b');

      const lines = rep.lines || [];
      if (lines.length === 0) {
        setError('No lines to drill. Add some lines first.');
        return;
      }

      const line = pickWeightedLine(lines);
      setCurrentLine(line);

      // Use PGN to reconstruct moves (guaranteed to have this)
      const moves = parsePgnToMoves(line.pgn);
      if (moves.length === 0) {
        setError('This line has no valid moves. Try re-adding it.');
        return;
      }
      setLineMoves(moves);

      // Reset the board
      chessRef.current.reset();
      setFen(chessRef.current.fen());

    } catch (err) {
      console.error('Failed to load drill', err);
      setError('Failed to load drill');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDrill();
  }, [loadDrill]);

  // After loading, if opponent moves first, play their move automatically
  useEffect(() => {
    if (!loading && lineMoves.length > 0 && moveIndex === 0 && !result) {
      const currentTurn = chessRef.current.turn();
      if (currentTurn !== playerColor) {
        playOpponentMove(0);
      }
    }
  }, [loading, lineMoves, playerColor]);

  const playOpponentMove = (idx) => {
    if (idx >= lineMoves.length) return;

    setWaitingForOpponent(true);

    setTimeout(() => {
      const chess = chessRef.current;
      const expectedMove = lineMoves[idx];
      const san = expectedMove.moveSan || expectedMove.san;

      try {
        const move = chess.move(san);
        if (move) {
          setFen(chess.fen());
          setLastMove({ from: move.from, to: move.to });
          setHighlightSquares({
            [move.from]: { backgroundColor: 'rgba(255, 170, 0, 0.25)' },
            [move.to]: { backgroundColor: 'rgba(255, 170, 0, 0.25)' },
          });
          const nextIdx = idx + 1;
          setMoveIndex(nextIdx);

          if (nextIdx >= lineMoves.length) {
            setResult('complete');
          }
        }
      } catch (e) {
        console.error('Failed to play opponent move:', san, e);
      }

      setWaitingForOpponent(false);
    }, 400);
  };

  const handleMove = ({ from, to }) => {
    if (result || waitingForOpponent) return false;
    if (moveIndex >= lineMoves.length) return false;

    const chess = chessRef.current;
    const expectedMove = lineMoves[moveIndex];
    const expectedSan = expectedMove.moveSan || expectedMove.san;

    try {
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) return false;

      const isCorrect = move.san === expectedSan;

      setLastMove({ from, to });
      setStats((s) => ({ ...s, total: s.total + 1 }));

      if (isCorrect) {
        setStats((s) => ({ ...s, correct: s.correct + 1 }));
        setHighlightSquares({
          [from]: { backgroundColor: 'rgba(76, 175, 80, 0.3)' },
          [to]: { backgroundColor: 'rgba(76, 175, 80, 0.3)' },
        });

        const nextIdx = moveIndex + 1;
        setMoveIndex(nextIdx);
        setFen(chess.fen());

        if (nextIdx >= lineMoves.length) {
          setResult('complete');
          repertoireApi.submitDrillResult(id, {
            lineId: currentLine.id,
            correct: true,
          }).catch(console.error);
        } else {
          // If next move is opponent's, play it automatically
          const nextTurn = chess.turn();
          if (nextTurn !== playerColor) {
            playOpponentMove(nextIdx);
          }
        }

        return true;
      } else {
        setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
        setResult('wrong');
        setHighlightSquares({
          [from]: { backgroundColor: 'rgba(244, 67, 54, 0.3)' },
          [to]: { backgroundColor: 'rgba(244, 67, 54, 0.3)' },
        });
        chess.undo();
        setFen(chess.fen());

        repertoireApi.submitDrillResult(id, {
          lineId: currentLine.id,
          correct: false,
        }).catch(console.error);

        return true;
      }
    } catch {
      return false;
    }
  };

  const handleRetry = () => {
    setResult(null);
    setHighlightSquares({});
    setLastMove(null);
  };

  const handleShowAnswer = () => {
    if (moveIndex < lineMoves.length) {
      const expectedMove = lineMoves[moveIndex];
      const uci = expectedMove.moveUci || expectedMove.uci || '';
      if (uci.length >= 4) {
        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        setHighlightSquares({
          [from]: { backgroundColor: 'rgba(33, 150, 243, 0.35)' },
          [to]: { backgroundColor: 'rgba(33, 150, 243, 0.35)' },
        });
      }
    }
  };

  const handleNextLine = () => {
    setStats({ correct: 0, wrong: 0, total: 0 });
    loadDrill();
  };

  const handleRestartLine = () => {
    chessRef.current.reset();
    setFen(chessRef.current.fen());
    setMoveIndex(0);
    setResult(null);
    setLastMove(null);
    setHighlightSquares({});
    setWaitingForOpponent(false);

    if (playerColor !== 'w' && lineMoves.length > 0) {
      setTimeout(() => playOpponentMove(0), 300);
    }
  };

  if (loading) {
    return (
      <div className="drill-page">
        <div className="drill-loading">
          <div className="loading-spinner" />
          <span>Loading drill…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="drill-page">
        <div className="drill-error">
          <p>{error}</p>
          <Link to={`/repertoire/${id}`} className="btn btn--ghost">
            <ArrowLeft size={16} /> Back to repertoire
          </Link>
        </div>
      </div>
    );
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const orientation = repertoire?.color?.toLowerCase() || 'white';
  const progress = lineMoves.length > 0 ? Math.round((moveIndex / lineMoves.length) * 100) : 0;
  const isPlayerTurn = chessRef.current.turn() === playerColor && !result && !waitingForOpponent;

  return (
    <div className="drill-page">
      {/* Header */}
      <div className="drill-header">
        <button className="btn btn--ghost" onClick={() => navigate(`/repertoire/${id}`)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="drill-header-info">
          <h1 className="drill-title">
            <Zap size={18} /> {repertoire?.name}
          </h1>
          {currentLine && (
            <span className="drill-line-label">{currentLine.lineName}</span>
          )}
        </div>
      </div>

      <div className="drill-layout">
        {/* Board */}
        <div className="drill-board-area">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            interactive={isPlayerTurn}
            onMove={handleMove}
            size={420}
            highlightSquares={highlightSquares}
            lastMove={lastMove}
          />
        </div>

        {/* Side panel */}
        <div className="drill-side">
          {/* Progress */}
          <div className="drill-progress-card">
            <div className="drill-progress-header">
              <span className="drill-progress-label">Progress</span>
              <span className="drill-progress-value">{moveIndex} / {lineMoves.length}</span>
            </div>
            <div className="drill-progress-bar">
              <div className="drill-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Stats */}
          <div className="drill-stats">
            <div className="drill-stat">
              <span className="drill-stat-label">Accuracy</span>
              <span className="drill-stat-value">{accuracy}%</span>
            </div>
            <div className="drill-stat-bar">
              <div className="drill-bar-correct" style={{ width: `${accuracy}%` }} />
            </div>
            <div className="drill-stat-counts">
              <span className="drill-correct-count">
                <Check size={12} /> {stats.correct}
              </span>
              <span className="drill-wrong-count">
                <X size={12} /> {stats.wrong}
              </span>
            </div>
          </div>

          {/* Prompt / Feedback */}
          <div className="drill-prompt">
            {waitingForOpponent && (
              <p className="drill-instruction drill-waiting">
                Opponent is playing…
              </p>
            )}

            {isPlayerTurn && (
              <p className="drill-instruction">
                <Target size={16} />
                Your turn — find the correct move
              </p>
            )}

            {result === 'complete' && (
              <div className="drill-feedback drill-feedback--complete">
                <Trophy size={20} />
                <div>
                  <strong>Line complete!</strong>
                  <p>You finished with {accuracy}% accuracy.</p>
                </div>
              </div>
            )}

            {result === 'wrong' && (
              <div className="drill-feedback drill-feedback--wrong">
                <X size={20} />
                <div>
                  <strong>Not quite</strong>
                  <p>
                    The correct move was{' '}
                    <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                      {lineMoves[moveIndex]?.moveSan || lineMoves[moveIndex]?.san}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="drill-actions">
            {result === 'wrong' && (
              <>
                <button className="btn btn--ghost" onClick={handleShowAnswer}>
                  <Eye size={14} /> Show on board
                </button>
                <button className="btn btn--primary" onClick={handleRetry}>
                  Try again
                </button>
              </>
            )}

            {result === 'complete' && (
              <>
                <button className="btn btn--ghost" onClick={handleRestartLine}>
                  <RotateCcw size={14} /> Restart line
                </button>
                <button className="btn btn--primary" onClick={handleNextLine}>
                  Next line
                </button>
              </>
            )}
          </div>

          {/* Move history */}
          {moveIndex > 0 && (
            <div className="drill-move-history">
              <span className="drill-history-label">Moves played</span>
              <div className="drill-history-moves">
                {lineMoves.slice(0, moveIndex).map((m, i) => (
                  <span key={i} className="move-tag">
                    {i % 2 === 0 && <span className="move-num">{Math.floor(i / 2) + 1}.</span>}
                    {m.moveSan || m.san}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

function pickWeightedLine(lines) {
  const total = lines.reduce((sum, l) => sum + (l.drillPriority || 5), 0);
  let random = Math.random() * total;
  for (const line of lines) {
    random -= (line.drillPriority || 5);
    if (random <= 0) return line;
  }
  return lines[0];
}

function parsePgnToMoves(pgn) {
  if (!pgn) return [];
  const chess = new Chess();
  const tokens = pgn
    .replace(/\d+\.\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const moves = [];
  for (const token of tokens) {
    try {
      const move = chess.move(token);
      if (move) {
        moves.push({
          san: move.san,
          moveSan: move.san,
          moveUci: `${move.from}${move.to}`,
          fenAfter: chess.fen(),
        });
      }
    } catch {
      break;
    }
  }
  return moves;
}