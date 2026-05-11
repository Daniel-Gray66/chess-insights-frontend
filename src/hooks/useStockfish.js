import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * React hook for Stockfish analysis with MultiPV support.
 * Returns top N lines with evaluations normalized to White's perspective.
 */
export default function useStockfish(depth = 18, multiPv = 4) {
  const workerRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const linesRef = useRef({});
  const fenRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    try {
      const worker = new Worker('/stockfish.js');

      if (cancelled) { worker.terminate(); return; }

      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (cancelled) return;
        const line = typeof e.data === 'string' ? e.data : '';
        if (!line) return;

        if (line === 'uciok') {
          setEngineReady(true);
          worker.postMessage(`setoption name MultiPV value ${multiPv}`);
          worker.postMessage('isready');
        }

        if (line === 'readyok') {
          setEngineReady(true);
        }

        // Parse "info" lines with multipv
        if (line.startsWith('info') && line.includes('score') && line.includes(' pv ')) {
          const parsed = parseInfoLine(line);
          if (parsed) {
            // Stockfish reports from side-to-move perspective.
            // Normalize to always be from White's perspective.
            const isBlackToMove = fenRef.current.includes(' b ');
            if (isBlackToMove) {
              parsed.score = -parsed.score;
            }

            linesRef.current = { ...linesRef.current, [parsed.pv]: parsed };
            const sorted = Object.values(linesRef.current)
              .sort((a, b) => a.pv - b.pv);
            setLines(sorted);
          }
        }

        if (line.startsWith('bestmove')) {
          setIsAnalyzing(false);
        }
      };

      worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
        setEngineError(true);
      };

      worker.postMessage('uci');
    } catch (err) {
      console.error('Failed to initialize Stockfish:', err);
      setEngineError(true);
    }

    return () => {
      cancelled = true;
      if (workerRef.current) {
        workerRef.current.postMessage('quit');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [multiPv]);

  const analyze = useCallback((fen) => {
    if (!workerRef.current) return;
    fenRef.current = fen;
    linesRef.current = {};
    setLines([]);
    setIsAnalyzing(true);
    workerRef.current.postMessage('stop');
    workerRef.current.postMessage('isready');
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, [depth]);

  const stop = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage('stop');
    setIsAnalyzing(false);
  }, []);

  // Derive "evaluation" from best line for backwards compat
  const evaluation = lines.length > 0 ? lines[0] : null;

  return { evaluation, lines, isAnalyzing, engineReady, engineError, analyze, stop };
}

/**
 * Parse a UCI "info" line into structured data.
 */
function parseInfoLine(line) {
  const tokens = line.split(' ');

  let depth = 0, pv = 1, score = 0, type = 'cp', bestLine = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'depth') depth = parseInt(tokens[i + 1], 10);
    if (tokens[i] === 'multipv') pv = parseInt(tokens[i + 1], 10);
    if (tokens[i] === 'score') {
      type = tokens[i + 1]; // 'cp' or 'mate'
      score = parseInt(tokens[i + 2], 10);
    }
    if (tokens[i] === 'pv') {
      bestLine = tokens.slice(i + 1);
    }
  }

  if (depth < 1) return null;

  return { depth, pv, score, type, bestLine };
}