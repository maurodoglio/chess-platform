import { useState, useCallback } from 'react';
import type { Chess } from 'chess.js';

export interface PremoveData {
  from: string;
  to: string;
  promotion?: string;
}

export function usePremove() {
  const [premove, setPremove] = useState<PremoveData | null>(null);

  const setPremoveAction = useCallback((from: string, to: string, promotion?: string) => {
    setPremove({ from, to, promotion });
  }, []);

  const clearPremove = useCallback(() => setPremove(null), []);

  // Try to execute premove after opponent moves. Validates with chess.js.
  const tryExecutePremove = useCallback((chess: Chess): PremoveData | null => {
    if (!premove) return null;
    try {
      const testMove = chess.move({ from: premove.from, to: premove.to, promotion: premove.promotion });
      if (testMove) {
        chess.undo();
        const result = { ...premove };
        setPremove(null);
        return result;
      }
    } catch { /* invalid move */ }
    setPremove(null);
    return null;
  }, [premove]);

  return { premove, setPremoveAction, clearPremove, tryExecutePremove };
}
