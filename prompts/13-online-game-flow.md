# Prompt 13 — Online Game Flow (Moves, Resign, Draw, Game Over)

## Context
We have a chessboard component, SignalR client, matchmaking UI, and backend game state management. Now we wire it all together: when two players are matched, they see the board and can play a full game — making moves, resigning, offering draws, and seeing the game over screen.

## What to Build
The complete online game flow on both frontend and backend. This is the step where the SignalR hub methods for moves/resign/draw get their real implementations.

## Prompt

```text
Implement the full online game flow, connecting the frontend chessboard to the backend via SignalR.

=== BACKEND CHANGES ===

UPDATE GAME HUB — /Hubs/GameHub.cs:

Replace all placeholder methods with real implementations:

MakeMove(Guid gameId, string move):
  1. Get userId from claims and active game from GameStateManager.
  2. Validate the caller is a participant in this game.
  3. Call IGameStateManager.TryMakeMove(gameId, userId, move).
  4. If illegal: send "IllegalMove" { attemptedMove, reason } to caller.
  5. If legal: send "MoveMade" { move (UCI), san, fen, timeWhiteMs, timeBlackMs, moveNumber } to BOTH players.
  6. If game is over: send "GameOver" { result, reason } to both players.
     (Rating updates and DB persistence will come in Prompt 16 — for now just end the game in memory.)

Resign(Guid gameId):
  1. Validate caller is in this game.
  2. Call IGameStateManager.Resign(gameId, userId).
  3. Send "GameOver" { result: opponent wins, reason: "resignation" } to both players.

OfferDraw(Guid gameId):
  1. Validate caller is in this game.
  2. Call IGameStateManager.OfferDraw().
  3. If successful, send "DrawOffered" to the opponent.

AcceptDraw(Guid gameId):
  1. Call IGameStateManager.AcceptDraw().
  2. If successful, send "GameOver" { result: "draw", reason: "draw_agreement" } to both players.

DeclineDraw(Guid gameId):
  1. Call IGameStateManager.DeclineDraw().
  2. Send "DrawDeclined" to the opponent.

=== FRONTEND CHANGES ===

SIGNALR EVENT TYPES — Update /types/signalr.ts:

export interface MoveMadeEvent {
  move: string;      // UCI
  san: string;       // SAN for display
  fen: string;
  timeWhiteMs: number;
  timeBlackMs: number;
  moveNumber: number;
}

export interface GameOverEvent {
  result: 'white' | 'black' | 'draw';
  reason: string;
  // ratingChange and newRating will be added in Prompt 16
}

export interface IllegalMoveEvent {
  attemptedMove: string;
  reason: string;
}

ONLINE GAME HOOK — /hooks/useOnlineGame.ts:

Manages the state of an ongoing online game:

function useOnlineGame(gameStartedEvent: GameStartedEvent) {
  // Initialize chess.js with starting FEN
  // Track: fen, moveHistory, turn, playerColor, timeWhiteMs, timeBlackMs, gameOverResult

  // Subscribe to SignalR events on mount, unsubscribe on unmount:
  // - "MoveMade": apply opponent's move to local chess.js, update fen/times
  // - "GameOver": set game over state
  // - "IllegalMove": revert the last local move, show error
  // - "DrawOffered": set drawOfferedByOpponent = true
  // - "DrawDeclined": clear draw offer state

  return {
    gameState,             // Current board state
    playerColor,
    timeWhiteMs,
    timeBlackMs,
    isMyTurn,
    gameOver,              // null or { result, reason }
    drawOfferedByOpponent,
    makeMove: (from, to, promotion?) => {
      // Validate locally with chess.js first
      // If legal locally, send via SignalR: gameHub.makeMove(gameId, uciMove)
      // Update local board optimistically
    },
    resign: () => gameHub.resign(gameId),
    offerDraw: () => gameHub.offerDraw(gameId),
    acceptDraw: () => gameHub.acceptDraw(gameId),
    declineDraw: () => gameHub.declineDraw(gameId),
  };
}

UPDATE ONLINE GAME PAGE — /pages/OnlineGamePage.tsx:

When state is 'playing' (after GameStarted received):
- Render the ChessBoard component:
  - Pass gameState from useOnlineGame
  - Pass playerColor
  - onMove → useOnlineGame.makeMove (only allow moves on player's turn)
  - interactive=true only when it's the player's turn

- Below/beside the board, render:
  - Opponent info: name + avatar (from GameStartedEvent)
  - Move list: display SAN moves in two-column format (move number + white move + black move)
  - Action buttons:
    - "Resign" button → confirmation dialog → resign()
    - "Offer Draw" button → offerDraw() (disabled if draw already offered)
  
  - If drawOfferedByOpponent: show "Opponent offers a draw" with Accept / Decline buttons.

GAME OVER OVERLAY — /components/GameOverDialog.tsx:
- Modal/overlay shown when game ends.
- Shows: result ("You won!" / "You lost" / "Draw"), reason (checkmate, resignation, etc.)
- "Back to Home" button → navigate to /
- "Play Again" button → navigate to /play/online (back to time control selection)

Verify:
1. Open two browser tabs, both logged in as different users.
2. Both select the same time control and get matched.
3. Both see the board from their respective color's perspective.
4. Moves made in one tab appear on the other tab's board.
5. Illegal moves are rejected and the board reverts.
6. Resign shows game over for both players.
7. Draw offer/accept/decline works correctly.
8. Checkmate ends the game and shows the game over dialog.
```
