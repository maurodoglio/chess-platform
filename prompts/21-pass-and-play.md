# Prompt 21 — Pass-and-Play Mode

## Context
Online multiplayer and vs Computer modes are complete. The third and final game mode is Pass-and-Play — two players sharing one device, alternating turns. This is entirely client-side.

## What to Build
A local two-player mode with optional time controls, using the existing chessboard and game panel components.

## Prompt

```text
Build the Pass-and-Play (local two-player) game mode.

LOCAL GAME SETUP — /components/LocalGameSetup.tsx:

Setup screen:
- Title: "Pass & Play"
- Subtitle: "Two players, one device"
- Time control selection: same grid as other modes, PLUS an "Untimed ∞" option (default).
- Optional: player name inputs (text fields):
  - "White's name" (default: "White")
  - "Black's name" (default: "Black")
- "Start Game" button.

LOCAL GAME HOOK — /hooks/useLocalGame.ts:

function useLocalGame(config: {
  timeControlId: string | 'untimed';
  whiteName: string;
  blackName: string;
}) {
  const { gameState, makeMove, getLegalMoves } = useChessGame();

  // Local clocks (same approach as useComputerGame):
  const [timeWhiteMs, setTimeWhiteMs] = useState(initialTime);
  const [timeBlackMs, setTimeBlackMs] = useState(initialTime);
  // Clock ticks for the current player's turn.
  // Increment added after each move.
  // Flag detection if time hits 0.

  const handleMove = (from: string, to: string, promotion?: string) => {
    const result = makeMove(from, to, promotion);
    if (result) {
      // Deduct elapsed time from the mover, add increment
    }
    return result !== null;
  };

  return {
    gameState,
    timeWhiteMs,
    timeBlackMs,
    currentTurn: gameState.turn,
    gameOver,
    handleMove,
    resign: (color: PieceColor) => { /* resign on behalf of the given color */ },
  };
}

LOCAL GAME PAGE — /pages/LocalGamePage.tsx:

States: 'setup' | 'playing' | 'gameover'

When 'setup':
  - Render LocalGameSetup.
  - On "Start Game": transition to 'playing'.

When 'playing':
  - Render the GamePanel component with:
    - Board always oriented from White's perspective (do NOT flip).
    - Both sides are interactive (any piece can be moved on the appropriate turn).
    - Player name on top: Black's name + clock.
    - Player name on bottom: White's name + clock.
    - Move list.
    - Buttons: "Resign" (with a dropdown or prompt: "Who resigns?" → White / Black), "Draw" (agree to draw → ends game).
    - No draw offer flow — just a "Declare Draw" button that both players agree on (immediate).
  
  - Turn indicator: show clearly "White to move" or "Black to move" (since both players see the same board orientation).

  - If untimed: hide the clocks.

When 'gameover':
  - Show GameOverDialog:
    - "White wins!" / "Black wins!" / "Draw"
    - Reason
    - No ratings
    - "Play Again" → back to setup (keep same config)
    - "Back to Home"

DIFFERENCES FROM ONLINE MODE:
- Board does not flip — always White at bottom.
- Both sides are interactive (no restriction on whose turn it is — the board just enforces legal moves for the current color).
- No SignalR, no server calls.
- No rating impact.
- Games are NOT saved to history.
- Resign needs to specify which color is resigning.

Verify:
1. Setup screen shows time control and name inputs.
2. Game starts, White can move, then Black can move.
3. Board stays from White's perspective.
4. Clocks tick for the active player.
5. Checkmate/stalemate ends the game correctly.
6. Resign works for either color.
7. Untimed mode works without clocks.
8. "Play Again" restarts with same settings.
```
