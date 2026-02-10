import { useState, useMemo, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';

interface LastMove {
  from: string;
  to: string;
}

export default function useReplay(pgn: string) {
  const { positions, moves, lastMoves } = useMemo(() => {
    const game = new Chess();
    const pos: string[] = [];
    const mv: string[] = [];
    const lm: LastMove[] = [];

    try {
      game.loadPgn(pgn);
      const history = game.history({ verbose: true });
      game.reset();
      pos.push(game.fen());

      for (const move of history) {
        game.move(move.san);
        pos.push(game.fen());
        mv.push(move.san);
        lm.push({ from: move.from, to: move.to });
      }
    } catch {
      pos.length = 0;
      pos.push(new Chess().fen());
    }

    return { positions: pos, moves: mv, lastMoves: lm };
  }, [pgn]);

  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Reset index when PGN changes
  useEffect(() => {
    setCurrentMoveIndex(0);
    setIsAutoPlaying(false);
  }, [pgn]);

  const isAtStart = currentMoveIndex === 0;
  const isAtEnd = currentMoveIndex === moves.length;

  const goToStart = useCallback(() => {
    setCurrentMoveIndex(0);
    setIsAutoPlaying(false);
  }, []);

  const goBack = useCallback(() => {
    setCurrentMoveIndex((i) => Math.max(0, i - 1));
  }, []);

  const goForward = useCallback(() => {
    setCurrentMoveIndex((i) => Math.min(moves.length, i + 1));
  }, [moves.length]);

  const goToEnd = useCallback(() => {
    setCurrentMoveIndex(moves.length);
    setIsAutoPlaying(false);
  }, [moves.length]);

  const goToMove = useCallback(
    (index: number) => {
      setCurrentMoveIndex(Math.max(0, Math.min(moves.length, index)));
    },
    [moves.length]
  );

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => !prev);
  }, []);

  // Auto-play: advance every 1.5s
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (currentMoveIndex >= moves.length) {
      setIsAutoPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setCurrentMoveIndex((i) => {
        if (i >= moves.length) {
          setIsAutoPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [isAutoPlaying, currentMoveIndex, moves.length]);

  return {
    currentFen: positions[currentMoveIndex],
    moves,
    currentMoveIndex,
    totalMoves: moves.length,
    lastMove: currentMoveIndex > 0 ? lastMoves[currentMoveIndex - 1] : null,
    goToStart,
    goBack,
    goForward,
    goToEnd,
    goToMove,
    isAtStart,
    isAtEnd,
    isAutoPlaying,
    toggleAutoPlay,
  };
}
