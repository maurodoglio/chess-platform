import { useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { ChessboardOptions } from 'react-chessboard';
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { GameState, PieceColor } from '../types/chess';
import { useTheme } from '../contexts/ThemeContext';

interface ChessBoardProps {
  gameState: GameState;
  playerColor: PieceColor;
  onMove?: (from: string, to: string, promotion?: string) => boolean;
  interactive?: boolean;
  boardWidth?: number;
  premove?: { from: string; to: string } | null;
  onPremove?: (from: string, to: string, promotion?: string) => void;
  onClearPremove?: () => void;
}

type SquareStyles = Record<string, React.CSSProperties>;

const HIGHLIGHT_PREMOVE = 'rgba(100, 100, 255, 0.4)';
const HIGHLIGHT_CHECK = 'radial-gradient(ellipse at center, rgba(255, 0, 0, 0.6) 0%, rgba(255, 0, 0, 0) 70%)';
const LEGAL_MOVE_DOT = 'radial-gradient(circle, rgba(0, 128, 0, 0.4) 25%, transparent 25%)';
const LEGAL_MOVE_RING = 'radial-gradient(circle, transparent 55%, rgba(0, 128, 0, 0.4) 55%, rgba(0, 128, 0, 0.4) 70%, transparent 70%)';

export default function ChessBoard({
  gameState,
  playerColor,
  onMove,
  interactive = true,
  boardWidth = 560,
  premove = null,
  onPremove,
  onClearPremove,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoveSquares, setLegalMoveSquares] = useState<string[]>([]);
  const [dragLegalMoves, setDragLegalMoves] = useState<string[]>([]);
  const { currentTheme } = useTheme();

  const isInteractive = interactive && !!onMove;
  const isOpponentTurn = !interactive && !!onPremove;

  const findKingSquare = useCallback((): string | null => {
    const fen = gameState.fen;
    const ranks = fen.split(' ')[0].split('/');
    const kingChar = gameState.turn === 'white' ? 'K' : 'k';
    const files = 'abcdefgh';
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of ranks[r]) {
        if (ch >= '1' && ch <= '8') {
          f += parseInt(ch);
        } else {
          if (ch === kingChar) {
            return `${files[f]}${8 - r}`;
          }
          f++;
        }
      }
    }
    return null;
  }, [gameState.fen, gameState.turn]);

  const squareStyles = useMemo(() => {
    const styles: SquareStyles = {};

    // Last move highlight
    if (gameState.lastMove) {
      styles[gameState.lastMove.from] = { background: currentTheme.lastMoveHighlight };
      styles[gameState.lastMove.to] = { background: currentTheme.lastMoveHighlight };
    }

    // Selected square
    if (selectedSquare) {
      styles[selectedSquare] = { background: currentTheme.selectedHighlight };
    }

    // Legal move indicators
    const activeLegalMoves = selectedSquare ? legalMoveSquares : dragLegalMoves;
    for (const sq of activeLegalMoves) {
      const hasPiece = squareHasPiece(gameState.fen, sq);
      styles[sq] = {
        background: hasPiece ? LEGAL_MOVE_RING : LEGAL_MOVE_DOT,
        ...(styles[sq] || {}),
      };
    }

    // Check highlight with pulse animation
    if (gameState.isCheck) {
      const kingSquare = findKingSquare();
      if (kingSquare) {
        styles[kingSquare] = {
          ...styles[kingSquare],
          background: HIGHLIGHT_CHECK,
          animation: 'check-pulse 1s ease-in-out infinite',
        };
      }
    }

    // Premove highlight
    if (premove) {
      styles[premove.from] = { ...styles[premove.from], background: HIGHLIGHT_PREMOVE };
      styles[premove.to] = { ...styles[premove.to], background: HIGHLIGHT_PREMOVE };
    }

    return styles;
  }, [gameState, selectedSquare, legalMoveSquares, dragLegalMoves, findKingSquare, currentTheme, premove]);

  const getLegalMovesFromFen = useCallback(
    (square: string): string[] => {
      try {
        const chess = new Chess(gameState.fen);
        return chess.moves({ square: square as Square, verbose: true }).map((m) => m.to);
      } catch {
        return [];
      }
    },
    [gameState.fen]
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;
      // Detect pawn promotion
      const pieceType = piece.pieceType;
      const isPawn = pieceType === 'P' || pieceType === 'p';
      const isPromotion =
        isPawn &&
        ((pieceType === 'P' && targetSquare[1] === '8') ||
          (pieceType === 'p' && targetSquare[1] === '1'));
      const promotion = isPromotion ? 'q' : undefined;

      if (isInteractive) {
        const result = onMove!(sourceSquare, targetSquare, promotion);
        setSelectedSquare(null);
        setLegalMoveSquares([]);
        setDragLegalMoves([]);
        return result;
      }

      // Opponent's turn: set premove
      if (isOpponentTurn) {
        onPremove!(sourceSquare, targetSquare, promotion);
        setSelectedSquare(null);
        setLegalMoveSquares([]);
        setDragLegalMoves([]);
        return true;
      }

      return false;
    },
    [isInteractive, isOpponentTurn, onMove, onPremove]
  );

  const handlePieceDrag = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (!isInteractive || !square) return;
      setSelectedSquare(null);
      setLegalMoveSquares([]);
      setDragLegalMoves(getLegalMovesFromFen(square));
    },
    [isInteractive, getLegalMovesFromFen]
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (isInteractive) {
        if (selectedSquare) {
          const result = onMove!(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoveSquares([]);
          if (result) return;
        }

        const legalMoves = getLegalMovesFromFen(square);
        if (legalMoves.length > 0) {
          setSelectedSquare(square);
          setLegalMoveSquares(legalMoves);
        } else {
          setSelectedSquare(null);
          setLegalMoveSquares([]);
        }
      } else if (isOpponentTurn) {
        // Premove click-click flow
        if (selectedSquare) {
          onPremove!(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoveSquares([]);
          return;
        }
        // Select a piece for premove (no legal-move filtering)
        if (squareHasPiece(gameState.fen, square)) {
          setSelectedSquare(square);
          setLegalMoveSquares([]);
        }
      }
    },
    [isInteractive, isOpponentTurn, selectedSquare, onMove, onPremove, getLegalMovesFromFen, gameState.fen]
  );

  const handlePieceClick = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (!square) return;

      if (isInteractive) {
        if (selectedSquare && selectedSquare !== square) {
          const result = onMove!(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoveSquares([]);
          if (result) return;
        }

        const legalMoves = getLegalMovesFromFen(square);
        if (legalMoves.length > 0) {
          setSelectedSquare(square);
          setLegalMoveSquares(legalMoves);
        } else {
          setSelectedSquare(null);
          setLegalMoveSquares([]);
        }
      } else if (isOpponentTurn) {
        if (selectedSquare && selectedSquare !== square) {
          onPremove!(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoveSquares([]);
          return;
        }
        setSelectedSquare(square);
        setLegalMoveSquares([]);
      }
    },
    [isInteractive, isOpponentTurn, selectedSquare, onMove, onPremove, getLegalMovesFromFen]
  );

  const handleRightClick = useCallback(() => {
    if (onClearPremove) onClearPremove();
    setSelectedSquare(null);
    setLegalMoveSquares([]);
  }, [onClearPremove]);

  const options: ChessboardOptions = {
    position: gameState.fen,
    boardOrientation: playerColor,
    squareStyles,
    onPieceDrop: handlePieceDrop,
    onSquareClick: handleSquareClick,
    onPieceClick: handlePieceClick,
    onPieceDrag: handlePieceDrag,
    animationDurationInMs: 150,
    allowDragging: isInteractive || isOpponentTurn,
    boardStyle: { width: boardWidth, height: boardWidth },
    darkSquareStyle: { backgroundColor: currentTheme.darkSquare },
    lightSquareStyle: { backgroundColor: currentTheme.lightSquare },
  };

  return (
    <div onContextMenu={(e) => { e.preventDefault(); handleRightClick(); }}>
      <Chessboard options={options} />
    </div>
  );
}

function squareHasPiece(fen: string, square: string): boolean {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  const ranks = fen.split(' ')[0].split('/');
  if (rank < 0 || rank > 7) return false;
  let col = 0;
  for (const ch of ranks[rank]) {
    if (ch >= '1' && ch <= '8') {
      col += parseInt(ch);
    } else {
      if (col === file) return true;
      col++;
    }
  }
  return false;
}
