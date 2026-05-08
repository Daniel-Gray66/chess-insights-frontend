import React, { useMemo } from 'react';
import { Chessboard, ChessboardDnDProvider } from 'react-chessboard';
import './ChessBoard.css';

/**
 * Reusable chess board component.
 *
 * Props:
 *   fen        - FEN string for the position to display
 *   orientation - 'white' | 'black'
 *   interactive - if true, allows piece dragging and fires onMove
 *   onMove     - callback({ from, to }) when a move is made
 *   size       - board width in px (default: 400)
 *   highlightSquares - { [square]: { backgroundColor: color } }
 *   lastMove   - { from, to } to highlight the last move
 */
function ChessBoardInner({
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  orientation = 'white',
  interactive = false,
  onMove,
  size = 400,
  highlightSquares = {},
  lastMove,
}) {
  const customSquareStyles = useMemo(() => {
    const styles = { ...highlightSquares };
    if (lastMove) {
      const highlight = 'rgba(255, 170, 0, 0.3)';
      styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: highlight };
      styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: highlight };
    }
    return styles;
  }, [highlightSquares, lastMove]);

  const handleDrop = (sourceSquare, targetSquare) => {
    if (!interactive || !onMove) return false;
    return onMove({ from: sourceSquare, to: targetSquare });
  };

  return (
    <div className="chess-board-wrapper" style={{ width: size }}>
      <Chessboard
        id="chess-board"
        position={fen}
        boardOrientation={orientation}
        onPieceDrop={handleDrop}
        arePiecesDraggable={interactive}
        boardWidth={size}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#8B9E82' }}
        customLightSquareStyle={{ backgroundColor: '#E8DFC9' }}
      />
    </div>
  );
}

export default function ChessBoard(props) {
  return (
    <ChessboardDnDProvider>
      <ChessBoardInner {...props} />
    </ChessboardDnDProvider>
  );
}