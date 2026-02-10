# Prompt 11 — Frontend Chessboard Component

## Context
The backend can now handle matchmaking and game state. Before wiring the frontend to SignalR, we need a solid chessboard component. This step builds it in isolation (usable for all three game modes later).

## What to Build
An interactive chessboard component using react-chessboard and chess.js, with legal move highlighting, click-to-move, drag-and-drop, and check/last-move indicators.

## Prompt

```text
Create the core chessboard component for the frontend. Install the required chess libraries and build a reusable, interactive board.

INSTALL NPM PACKAGES:
- chess.js (chess logic)
- react-chessboard (board rendering)

TYPES — /types/chess.ts:

export type PieceColor = 'white' | 'black';

export interface GameState {
  fen: string;
  turn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  moveHistory: string[];     // SAN moves
  lastMove: { from: string; to: string } | null;
}

CHESS GAME HOOK — /hooks/useChessGame.ts:

A custom hook that wraps chess.js and manages local game state:

function useChessGame(initialFen?: string) {
  // Internal chess.js instance (using useRef)
  // State: gameState (GameState above)

  return {
    gameState,
    makeMove: (from: string, to: string, promotion?: string) => MoveResult | null,
    // Returns { san, isCapture, isCheck, isCastle, gameResult } or null if illegal
    getLegalMoves: (square: string) => string[],  // Returns target squares
    loadFen: (fen: string) => void,
    reset: () => void,
    undo: () => void,
  };
}

- makeMove: Use chess.js move() function. If legal, update gameState. If illegal, return null.
- getLegalMoves: Use chess.js moves({ square, verbose: true }) to get target squares.
- loadFen: Load a position from FEN string.
- Export the hook.

CHESSBOARD COMPONENT — /components/ChessBoard.tsx:

Props:
interface ChessBoardProps {
  gameState: GameState;
  playerColor: PieceColor;
  onMove?: (from: string, to: string, promotion?: string) => boolean;
  interactive?: boolean;    // false for replay mode
  boardWidth?: number;
}

Implementation:
- Use react-chessboard's <Chessboard> component.
- Set position from gameState.fen.
- Set boardOrientation based on playerColor.
- boardWidth defaults to 560px (or responsive, see later step).

Click-to-move:
- Track selectedSquare in state.
- On square click:
  - If no piece selected and clicked square has a piece of the player's color → select it, show legal moves.
  - If piece already selected and clicked square is a legal move → call onMove.
  - If piece already selected and clicked square is own piece → re-select.
  - If clicked square is not a legal move → deselect.

Drag-and-drop:
- Use onPieceDrop callback → call onMove.
- Use onPieceDragBegin → highlight legal moves for that piece.

Legal move indicators:
- Use customSquareStyles to show:
  - Dots (small colored circles) on empty legal target squares.
  - Colored rings on capturable squares.
- Use a semi-transparent green/blue color.

Highlight last move:
- If gameState.lastMove is set, highlight from/to squares with a yellow/green tint.

Highlight check:
- If gameState.isCheck, highlight the current player's king square in red.

Promotion:
- When a pawn reaches the 8th rank, show a promotion dialog (Queen/Rook/Bishop/Knight).
- react-chessboard has built-in promotion support — use autoPromoteToQueen=false and the onPromotionPieceSelect callback.

DEMO PAGE — Update /pages/LocalGamePage.tsx temporarily:
- Render the ChessBoard component with useChessGame hook.
- Allow both sides to move (for testing purposes).
- Display the move list below the board as a simple list of SAN moves.
- Display whose turn it is.

Verify:
- Board renders with all pieces in starting position.
- Clicking a piece highlights legal moves with dots.
- Dragging and dropping a piece makes a valid move.
- Illegal moves are rejected (piece snaps back).
- Last move is highlighted.
- Check is highlighted in red.
- Pawn promotion shows piece selection dialog.
- Move list updates after each move.
```
