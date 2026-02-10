export type PieceColor = 'white' | 'black';

export interface GameState {
  fen: string;
  turn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  moveHistory: string[];
  lastMove: { from: string; to: string } | null;
}

export interface MoveInfo {
  san: string;
  isCapture: boolean;
  isCheck: boolean;
  isCastle: boolean;
}
