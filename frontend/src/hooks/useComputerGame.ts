import { useState, useEffect, useCallback, useRef } from 'react';
import { useChessGame } from './useChessGame';
import { useStockfish } from './useStockfish';
import { useGameSounds } from './useGameSounds';
import { timeControls, type TimeControl } from '../data/timeControls';
import type { Difficulty } from '../services/stockfishService';
import type { PieceColor } from '../types/chess';

export interface ComputerGameConfig {
  difficulty: Difficulty;
  playerColor: PieceColor;
  timeControlId: string; // timeControl id or 'untimed'
}

export interface GameOverInfo {
  result: 'white' | 'black' | 'draw';
  reason: string;
}

export function useComputerGame(config: ComputerGameConfig) {
  const { difficulty, playerColor, timeControlId } = config;
  const computerColor: PieceColor = playerColor === 'white' ? 'black' : 'white';

  const { gameState, makeMove: chessMove } = useChessGame();
  const { isLoading, error, isFallback, getBestMove } = useStockfish(difficulty);
  const { playMoveSound, playGameStart, playGameEnd, playIllegal } = useGameSounds();

  const tc: TimeControl | undefined = timeControls.find(t => t.id === timeControlId);
  const isTimed = timeControlId !== 'untimed' && !!tc;

  const [timeWhiteMs, setTimeWhiteMs] = useState(tc?.baseTimeMs ?? 0);
  const [timeBlackMs, setTimeBlackMs] = useState(tc?.baseTimeMs ?? 0);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const thinkingRef = useRef(false);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const moveCountRef = useRef(0);

  const isMyTurn = gameState.turn === playerColor;

  // Clock management
  useEffect(() => {
    if (!isTimed || gameOver || gameState.isGameOver || isLoading) {
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
  }, [isTimed, gameOver, gameState.isGameOver, gameState.turn, isLoading]);

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

  // Play game start sound when engine loads
  useEffect(() => {
    if (!isLoading && !error) playGameStart();
  }, [isLoading, error, playGameStart]);

  // AI auto-play
  const triggerComputerMove = useCallback(async (fen: string) => {
    if (thinkingRef.current) return;
    thinkingRef.current = true;
    setIsThinking(true);
    try {
      const uciMove = await getBestMove(fen);
      if (uciMove === '(none)') return;
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
      const result = chessMove(from, to, promotion);
      if (result) {
        playMoveSound(result);
        if (isTimed && tc) {
          moveCountRef.current += 1;
          if (computerColor === 'white') {
            setTimeWhiteMs(prev => prev + tc.incrementMs);
          } else {
            setTimeBlackMs(prev => prev + tc.incrementMs);
          }
        }
      }
    } finally {
      thinkingRef.current = false;
      setIsThinking(false);
    }
  }, [getBestMove, chessMove, isTimed, tc, computerColor, playMoveSound]);

  useEffect(() => {
    if (!isLoading && !gameOver && !gameState.isGameOver && gameState.turn === computerColor && !thinkingRef.current) {
      triggerComputerMove(gameState.fen);
    }
  }, [isLoading, gameOver, gameState.isGameOver, gameState.turn, computerColor, gameState.fen, triggerComputerMove]);

  // Player makes a move
  const makeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (gameState.turn !== playerColor || isThinking || gameOver) return false;
    const result = chessMove(from, to, promotion);
    if (!result) { playIllegal(); return false; }
    playMoveSound(result);
    if (isTimed && tc) {
      moveCountRef.current += 1;
      if (playerColor === 'white') {
        setTimeWhiteMs(prev => prev + tc.incrementMs);
      } else {
        setTimeBlackMs(prev => prev + tc.incrementMs);
      }
    }
    return true;
  }, [gameState.turn, playerColor, isThinking, gameOver, chessMove, isTimed, tc, playMoveSound, playIllegal]);

  // Resign
  const resign = useCallback(() => {
    if (gameOver) return;
    setGameOver({ result: computerColor, reason: 'resignation' });
  }, [gameOver, computerColor]);

  return {
    gameState,
    playerColor,
    timeWhiteMs,
    timeBlackMs,
    isMyTurn: isMyTurn && !isThinking,
    gameOver,
    isLoading,
    error,
    isFallback,
    isThinking,
    isTimed,
    makeMove,
    resign,
  };
}
