import { useState, useEffect, useCallback, useRef } from 'react';
import { stockfishService, type Difficulty } from '../services/stockfishService';

export function useStockfish(difficulty: Difficulty) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Avoid double-init in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    stockfishService
      .init()
      .then(() => {
        if (!cancelled) {
          stockfishService.setDifficulty(difficulty);
          setIsFallback(stockfishService.isFallback);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load chess engine');
      });

    return () => {
      cancelled = true;
      stockfishService.destroy();
      initRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update difficulty without re-initializing
  useEffect(() => {
    if (!isLoading) {
      stockfishService.setDifficulty(difficulty);
    }
  }, [difficulty, isLoading]);

  const getBestMove = useCallback(async (fen: string): Promise<string> => {
    return stockfishService.getBestMove(fen);
  }, []);

  return { isLoading, error, isFallback, getBestMove };
}
