import { useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { GameState, MoveInfo, PieceColor } from '../types/chess';

function buildGameState(chess: Chess, lastMove: { from: string; to: string } | null): GameState {
  return {
    fen: chess.fen(),
    turn: chess.turn() === 'w' ? 'white' : 'black' as PieceColor,
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    moveHistory: chess.history(),
    lastMove,
  };
}

export function useChessGame() {
  const chessRef = useRef(new Chess());
  const [gameState, setGameState] = useState<GameState>(() =>
    buildGameState(chessRef.current, null)
  );

  const makeMove = useCallback((from: string, to: string, promotion?: string): MoveInfo | null => {
    try {
      const result = chessRef.current.move({ from, to, promotion });
      if (!result) return null;
      const last = { from, to };
      setGameState(buildGameState(chessRef.current, last));
      return {
        san: result.san,
        isCapture: result.captured !== undefined,
        isCheck: result.san.includes('+') || result.san.includes('#'),
        isCastle: result.san === 'O-O' || result.san === 'O-O-O',
      };
    } catch {
      return null;
    }
  }, []);

  const getLegalMoves = useCallback((square: string): string[] => {
    const moves = chessRef.current.moves({ square: square as never, verbose: true });
    return moves.map((m) => m.to);
  }, []);

  const loadFen = useCallback((fen: string) => {
    chessRef.current.load(fen);
    setGameState(buildGameState(chessRef.current, null));
  }, []);

  const reset = useCallback(() => {
    chessRef.current.reset();
    setGameState(buildGameState(chessRef.current, null));
  }, []);

  const undo = useCallback(() => {
    const result = chessRef.current.undo();
    if (result) {
      const history = chessRef.current.history({ verbose: true });
      const last = history.length > 0
        ? { from: history[history.length - 1].from, to: history[history.length - 1].to }
        : null;
      setGameState(buildGameState(chessRef.current, last));
    }
  }, []);

  return { gameState, makeMove, getLegalMoves, loadFen, reset, undo };
}
