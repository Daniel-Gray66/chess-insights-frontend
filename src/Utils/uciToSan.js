import { Chess } from 'chess.js';

const PIECE_SYMBOLS = {
  k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '',
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '',
};

/**
 * Convert a sequence of UCI moves (e.g. ['e2e4','d7d5','e4d5'])
 * into SAN with piece symbols (e.g. ['e4','d5','♙exd5'])
 *
 * @param {string} fen - Starting position FEN
 * @param {string[]} uciMoves - Array of UCI move strings
 * @returns {string[]} Array of SAN strings with piece symbols
 */
export function uciToSan(fen, uciMoves) {
  if (!fen || !uciMoves?.length) return [];

  try {
    const chess = new Chess(fen);
    const result = [];

    for (const uci of uciMoves) {
      if (!uci || uci.length < 4) break;

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;

      try {
        const move = chess.move({ from, to, promotion });
        if (!move) break;

        // Replace piece letter with symbol
        let san = move.san;
        if (move.piece && move.piece !== 'p') {
          const symbol = PIECE_SYMBOLS[move.piece] || '';
          // SAN starts with uppercase piece letter for non-pawns
          san = symbol + san.slice(1);
        }

        result.push(san);
      } catch {
        break;
      }
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Format a single UCI move to SAN with piece symbol.
 */
export function uciMoveToSan(fen, uciMove) {
  const result = uciToSan(fen, [uciMove]);
  return result.length > 0 ? result[0] : uciMove;
}