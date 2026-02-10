import { useState, useEffect, useCallback, useRef } from 'react';
import { useChessGame } from './useChessGame';
import { useGameSounds } from './useGameSounds';
import { timeControls, type TimeControl } from '../data/timeControls';
import type { PieceColor } from '../types/chess';

export interface LocalGameConfig {
  timeControlId: string; // timeControl id or 'untimed'
  whiteName: string;
  blackName: string;
}

export interface GameOverInfo {
  result: 'white' | 'black' | 'draw';
  reason: string;
}

export function useLocalGame(config: LocalGameConfig) {
  const { timeControlId } = config;
  const { gameState, makeMove: chessMove } = useChessGame();
  const { playMoveSound, playGameStart, playGameEnd, playIllegal } = useGameSounds();

  const tc: TimeControl | undefined = timeControls.find(t => t.id === timeControlId);
  const isTimed = timeControlId !== 'untimed' && !!tc;

  const [timeWhiteMs, setTimeWhiteMs] = useState(tc?.baseTimeMs ?? 0);
  const [timeBlackMs, setTimeBlackMs] = useState(tc?.baseTimeMs ?? 0);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);

  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const moveCountRef = useRef(0);

  // Clock management
  useEffect(() => {
    if (!isTimed || gameOver || gameState.isGameOver) {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
      }
      return;
    }

    // Don't start clock until at least one move has been made
    if (moveCountRef.current === 0) return;

    lastTickRef.current = Date.now();
    clockIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      if (gameState.turn === 'white') {
        setTimeWhiteMs(prev => {
          const next = prev - elapsed;
          if (next <= 0) {
            clearInterval(clockIntervalRef.current!);
            clockIntervalRef.current = null;
            return 0;
          }
          return next;
        });
      } else {
        setTimeBlackMs(prev => {
          const next = prev - elapsed;
          if (next <= 0) {
            clearInterval(clockIntervalRef.current!);
            clockIntervalRef.current = null;
            return 0;
          }
          return next;
        });
      }
    }, 100);

    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
      }
    };
  }, [isTimed, gameOver, gameState.isGameOver, gameState.turn]);

  // Detect timeout
  useEffect(() => {
    if (!isTimed || gameOver) return;
    if (timeWhiteMs <= 0) {
      setGameOver({ result: 'black', reason: 'timeout' });
    } else if (timeBlackMs <= 0) {
      setGameOver({ result: 'white', reason: 'timeout' });
    }
  }, [timeWhiteMs, timeBlackMs, isTimed, gameOver]);

  // Detect checkmate / stalemate / draw from chess.js
  useEffect(() => {
    if (gameOver) return;
    if (gameState.isCheckmate) {
      const winner: PieceColor = gameState.turn === 'white' ? 'black' : 'white';
      setGameOver({ result: winner, reason: 'checkmate' });
      playGameEnd();
    } else if (gameState.isStalemate) {
      setGameOver({ result: 'draw', reason: 'stalemate' });
      playGameEnd();
    } else if (gameState.isDraw) {
      setGameOver({ result: 'draw', reason: 'draw' });
      playGameEnd();
    }
  }, [gameState.isCheckmate, gameState.isStalemate, gameState.isDraw, gameState.turn, gameOver, playGameEnd]);

  // Play game start sound on mount
  useEffect(() => {
    playGameStart();
  }, [playGameStart]);

  // Either side makes a move
  const handleMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (gameOver) return false;
    const result = chessMove(from, to, promotion);
    if (!result) { playIllegal(); return false; }
    playMoveSound(result);
    if (isTimed && tc) {
      moveCountRef.current += 1;
      const movedColor: PieceColor = gameState.turn; // still old turn in this callback scope
      if (movedColor === 'white') {
        setTimeWhiteMs(prev => prev + tc.incrementMs);
      } else {
        setTimeBlackMs(prev => prev + tc.incrementMs);
      }
    }
    return true;
  }, [gameOver, chessMove, isTimed, tc, gameState.turn, playMoveSound, playIllegal]);

  // Resign (takes a color parameter — which player resigns)
  const resign = useCallback((color: PieceColor) => {
    if (gameOver) return;
    const winner: PieceColor = color === 'white' ? 'black' : 'white';
    setGameOver({ result: winner, reason: 'resignation' });
  }, [gameOver]);

  // Declare draw (immediate, no offer flow)
  const declareDraw = useCallback(() => {
    if (gameOver) return;
    setGameOver({ result: 'draw', reason: 'draw_agreement' });
  }, [gameOver]);

  return {
    gameState,
    timeWhiteMs,
    timeBlackMs,
    gameOver,
    isTimed,
    handleMove,
    resign,
    declareDraw,
  };
}
