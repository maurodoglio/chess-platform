# Prompt 20 — Play vs Computer Game Flow

## Context
Stockfish WASM runs in a Web Worker and can return best moves. Now we build the full "Play vs Computer" game flow where the user selects difficulty and color, plays against the AI, and sees the game result. This mode is entirely client-side — no server involvement.

## What to Build
The computer game setup screen, the game loop (player moves → AI responds), local clocks, and game over handling.

## Prompt

```text
Build the complete "Play vs Computer" game flow on the frontend.

COMPUTER GAME SETUP — /components/ComputerGameSetup.tsx:

A setup screen shown before the game starts:

- Title: "Play vs Computer"
- Difficulty selection: three large buttons (Easy 🟢 / Medium 🟡 / Hard 🔴)
  - Highlight the selected one.
  - Default: Medium.
- Color selection: three buttons (White ♔ / Black ♚ / Random 🎲)
  - Default: Random.
- Time control selection: same grid as online matchmaking (reuse the time control data).
  - Include an "Untimed" option for vs Computer mode.
- "Start Game" button (prominent, bottom).
  - Disabled until loading Stockfish (show "Loading engine..." with spinner).

COMPUTER GAME HOOK — /hooks/useComputerGame.ts:

function useComputerGame(config: {
  difficulty: 'easy' | 'medium' | 'hard';
  playerColor: PieceColor;
  timeControlId: string | 'untimed';
}) {
  const { getBestMove, isLoading, error } = useStockfish(config.difficulty);
  const { gameState, makeMove, getLegalMoves } = useChessGame();

  // Track local clocks (if timed):
  const [timeWhiteMs, setTimeWhiteMs] = useState(initialTime);
  const [timeBlackMs, setTimeBlackMs] = useState(initialTime);
  // Use useRef + setInterval for local clock countdown.

  // AI move logic:
  useEffect(() => {
    // When it's the AI's turn and the game is not over:
    // 1. Get the best move from Stockfish: getBestMove(gameState.fen)
    // 2. Wait for the simulated think time delay
    // 3. Apply the move: makeMove(from, to, promotion)
    // 4. Update clocks (deduct AI's elapsed time, add increment)
  }, [gameState.turn, gameState.isGameOver]);

  // When player makes a move:
  const handlePlayerMove = (from: string, to: string, promotion?: string) => {
    if (gameState.turn !== playerColor) return false;  // Not player's turn
    const result = makeMove(from, to, promotion);
    if (result) {
      // Deduct player's elapsed time, add increment
      // AI will auto-respond via the useEffect above
    }
    return result !== null;
  };

  // Clock flag: if a player's time hits 0, game over
  // Check on each clock tick

  return {
    gameState,
    playerColor,
    timeWhiteMs,
    timeBlackMs,
    isMyTurn: gameState.turn === config.playerColor,
    gameOver,     // { result, reason } or null
    isEngineLoading: isLoading,
    engineError: error,
    handlePlayerMove,
    resign: () => { /* set game over with resignation */ },
  };
}

COMPUTER GAME PAGE — /pages/ComputerGamePage.tsx:

States: 'setup' | 'playing' | 'gameover'

When 'setup':
  - Render ComputerGameSetup.
  - On "Start Game": transition to 'playing' with selected config.

When 'playing':
  - Render GamePanel (same component used for online play) with:
    - Opponent name: "Stockfish (Easy/Medium/Hard)"
    - Opponent avatar: a robot icon or chess engine icon
    - Player's name and avatar from auth context
    - Clocks from useComputerGame
    - onMove → handlePlayerMove
    - Resign button (no draw offer — you can't draw against the computer, just resign)
  - If engine is loading, show an overlay: "Engine loading..."
  - If engine error, show error message.

  - If AI's turn, show a subtle indicator (e.g., "Stockfish is thinking..." below the board).

  - If the game starts with AI playing white (player chose black):
    - AI makes the first move automatically.

When 'gameover':
  - Show GameOverDialog:
    - "You won!" / "You lost" / "Draw"
    - Reason (checkmate, timeout, stalemate, resignation)
    - No rating change displayed (computer games don't affect rating)
    - "Play Again" → back to setup
    - "Back to Home" → navigate to /

UNTIMED MODE:
  - If timeControlId is 'untimed', don't render clocks, don't track time.

Verify:
1. Select difficulty, color, and time control → game starts.
2. Player makes a move → Stockfish responds after a delay.
3. Playing as black → Stockfish makes the first move.
4. Clocks tick down for both sides.
5. Checkmate by either side shows correct game over.
6. Resign works.
7. Untimed mode works without clocks.
8. Refreshing the page during a game goes back to setup (no persistence needed).
```
