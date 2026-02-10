import { useState, useEffect, useCallback, useRef } from 'react';
import { useChessGame } from './useChessGame';
import { useGameSounds, parseSanForSound } from './useGameSounds';
import { usePremove } from './usePremove';
import { useToast } from '../contexts/ToastContext';
import { Chess } from 'chess.js';
import { gameHub } from '../services/signalr';
import type { GameStartedEvent, MoveMadeEvent, GameOverEvent, IllegalMoveEvent, GameResyncedEvent, OpponentDisconnectedEvent } from '../types/signalr';
import type { PieceColor } from '../types/chess';

export interface GameOverInfo {
  result: 'white' | 'black' | 'draw';
  reason: string;
}

export function useOnlineGame(gameInfo: GameStartedEvent) {
  const { gameState, makeMove: chessMove, loadFen } = useChessGame();
  const { playMoveSound, playGameStart, playGameEnd, playIllegal } = useGameSounds();
  const { premove, setPremoveAction, clearPremove, tryExecutePremove } = usePremove();
  const { showToast } = useToast();
  const [timeWhiteMs, setTimeWhiteMs] = useState(gameInfo.initialTimeMs);
  const [timeBlackMs, setTimeBlackMs] = useState(gameInfo.initialTimeMs);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [drawOfferedByOpponent, setDrawOfferedByOpponent] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectionDeadline, setReconnectionDeadline] = useState<string | null>(null);
  const gameIdRef = useRef(gameInfo.gameId);

  useEffect(() => {
    const onMoveMade = (event: MoveMadeEvent) => {
      loadFen(event.fen);
      setTimeWhiteMs(event.timeWhiteMs);
      setTimeBlackMs(event.timeBlackMs);
      playMoveSound(parseSanForSound(event.san));

      // Try to execute pending premove after opponent's move
      try {
        const chess = new Chess(event.fen);
        const pm = tryExecutePremove(chess);
        if (pm) {
          const uci = pm.from + pm.to + (pm.promotion ?? '');
          gameHub.makeMove(gameIdRef.current, uci).catch((err) =>
            console.error('Failed to send premove:', err)
          );
          // Apply locally
          const result = chessMove(pm.from, pm.to, pm.promotion);
          if (result) playMoveSound(result);
        }
      } catch { /* ignore premove errors */ }
    };

    const onGameOver = (event: GameOverEvent) => {
      setGameOver({ result: event.result, reason: event.reason });
      playGameEnd();
    };

    const onIllegalMove = (event: IllegalMoveEvent) => {
      console.warn('Illegal move rejected by server:', event.attemptedMove, event.reason);
      playIllegal();
      showToast(`Illegal move: ${event.reason}`, 'error');
    };

    const onDrawOffered = () => {
      setDrawOfferedByOpponent(true);
    };

    const onDrawDeclined = () => {
      setDrawOfferedByOpponent(false);
      showToast('Draw declined', 'info');
    };

    const onGameResynced = (event: GameResyncedEvent) => {
      gameIdRef.current = event.gameId;
      loadFen(event.fen);
      setTimeWhiteMs(event.timeWhiteMs);
      setTimeBlackMs(event.timeBlackMs);
      if (event.drawOffer === 'white' && event.playerColor === 'black') {
        setDrawOfferedByOpponent(true);
      } else if (event.drawOffer === 'black' && event.playerColor === 'white') {
        setDrawOfferedByOpponent(true);
      }
      showToast('Reconnected to game', 'success');
    };

    const onOpponentDisconnected = (event: OpponentDisconnectedEvent) => {
      setOpponentDisconnected(true);
      setReconnectionDeadline(event.reconnectionDeadlineUtc);
      showToast('Opponent disconnected, waiting for reconnection...', 'warning');
    };

    const onOpponentReconnected = () => {
      setOpponentDisconnected(false);
      setReconnectionDeadline(null);
      showToast('Opponent reconnected', 'success');
    };

    const onError = (message: string) => {
      showToast(message, 'error');
    };

    gameHub.on('MoveMade', onMoveMade);
    gameHub.on('GameOver', onGameOver);
    gameHub.on('IllegalMove', onIllegalMove);
    gameHub.on('DrawOffered', onDrawOffered);
    gameHub.on('DrawDeclined', onDrawDeclined);
    gameHub.on('GameResynced', onGameResynced);
    gameHub.on('OpponentDisconnected', onOpponentDisconnected);
    gameHub.on('OpponentReconnected', onOpponentReconnected);
    gameHub.on('Error', onError);

    return () => {
      gameHub.off('MoveMade', onMoveMade);
      gameHub.off('GameOver', onGameOver);
      gameHub.off('IllegalMove', onIllegalMove);
      gameHub.off('DrawOffered', onDrawOffered);
      gameHub.off('DrawDeclined', onDrawDeclined);
      gameHub.off('GameResynced', onGameResynced);
      gameHub.off('OpponentDisconnected', onOpponentDisconnected);
      gameHub.off('OpponentReconnected', onOpponentReconnected);
      gameHub.off('Error', onError);
    };
  }, [loadFen, playMoveSound, playGameEnd, playIllegal, tryExecutePremove, chessMove, showToast]);

  // Play game start sound on mount
  useEffect(() => {
    playGameStart();
  }, [playGameStart]);

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const result = chessMove(from, to, promotion);
      if (!result) { playIllegal(); return false; }

      playMoveSound(result);
      const uci = from + to + (promotion ?? '');
      gameHub.makeMove(gameIdRef.current, uci).catch((err) =>
        console.error('Failed to send move:', err)
      );
      return true;
    },
    [chessMove, playMoveSound, playIllegal]
  );

  const resign = useCallback(() => {
    gameHub.resign(gameIdRef.current).catch((err) =>
      console.error('Failed to resign:', err)
    );
  }, []);

  const offerDraw = useCallback(() => {
    gameHub.offerDraw(gameIdRef.current).catch((err) =>
      console.error('Failed to offer draw:', err)
    );
    showToast('Draw offered', 'info');
  }, [showToast]);

  const acceptDraw = useCallback(() => {
    setDrawOfferedByOpponent(false);
    gameHub.acceptDraw(gameIdRef.current).catch((err) =>
      console.error('Failed to accept draw:', err)
    );
  }, []);

  const declineDraw = useCallback(() => {
    setDrawOfferedByOpponent(false);
    gameHub.declineDraw(gameIdRef.current).catch((err) =>
      console.error('Failed to decline draw:', err)
    );
  }, []);

  const isMyTurn =
    (gameInfo.playerColor === 'white' && gameState.turn === 'white') ||
    (gameInfo.playerColor === 'black' && gameState.turn === 'black');

  return {
    gameState,
    playerColor: gameInfo.playerColor as PieceColor,
    timeWhiteMs,
    timeBlackMs,
    isMyTurn,
    gameOver,
    drawOfferedByOpponent,
    opponentDisconnected,
    reconnectionDeadline,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    premove,
    setPremoveAction,
    clearPremove,
  };
}
