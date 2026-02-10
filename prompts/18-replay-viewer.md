# Prompt 18 — Replay Viewer

## Context
We have a game history page that lists past games and a REST API that returns full game details including PGN. Now we need a replay viewer that lets users step through completed games move by move.

## What to Build
A replay viewer page that loads a game by ID, parses the PGN, and lets the user navigate through moves with the chessboard reflecting each position.

## Prompt

```text
Build the game replay viewer page.

REPLAY HOOK — /hooks/useReplay.ts:

Takes a PGN string and provides replay controls:

function useReplay(pgn: string) {
  // Parse PGN into a list of positions using chess.js:
  // 1. Create a new chess.js game.
  // 2. Load the PGN.
  // 3. Get the full move history (verbose) to extract FENs.
  // 4. Replay each move from the start, recording the FEN after each move.
  //    Result: positions[] where positions[0] = starting FEN, positions[N] = FEN after move N.
  //    Also record: moves[] as SAN strings.

  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  // currentMoveIndex 0 = starting position, 1 = after first move, etc.

  return {
    currentFen: positions[currentMoveIndex],
    moves,                          // All SAN moves
    currentMoveIndex,
    totalMoves: moves.length,
    lastMove: ...,                  // { from, to } of the move that led to current position (null at index 0)
    goToStart: () => setCurrentMoveIndex(0),
    goBack: () => setCurrentMoveIndex(prev => Math.max(0, prev - 1)),
    goForward: () => setCurrentMoveIndex(prev => Math.min(moves.length, prev + 1)),
    goToEnd: () => setCurrentMoveIndex(moves.length),
    goToMove: (index: number) => setCurrentMoveIndex(clamp(index, 0, moves.length)),
    isAtStart: currentMoveIndex === 0,
    isAtEnd: currentMoveIndex === moves.length,
  };
}

REPLAY PAGE — /pages/ReplayPage.tsx (route: /history/:id):

- On mount, fetch the game via fetchGame(id).
- While loading, show a centered spinner.
- If game not found (404), show "Game not found" with link back to history.

Layout:
- Game info header:
  - "White: PlayerName (1200 → 1215)" vs "Black: OpponentName (1180 → 1165)"
  - Result: "White wins by checkmate" (human readable)
  - Time control: "Blitz 5+0"
  - Date played

- ChessBoard component:
  - Render the position at currentFen from useReplay.
  - interactive=false (no piece dragging/clicking)
  - Highlight the lastMove
  - Board orientation: show from the perspective of the logged-in user (their color)

- Replay controls (below the board):
  ⏮ [Start]  ◀ [Back]  ▶ [Forward]  ⏭ [End]  ▶ [Auto-play]
  - Buttons styled with clear icons and hover effects.
  - Disabled state when at start/end.
  - Auto-play: toggles an interval that calls goForward every 1.5 seconds. Button changes to ⏸ [Pause] when active.

- Move list (beside the board on desktop, below on mobile):
  - Same MoveList component from Prompt 15.
  - Highlight the current move (based on currentMoveIndex).
  - Clicking a move in the list jumps to that position (goToMove).

KEYBOARD NAVIGATION:
- Use useEffect to listen for keydown events:
  - ArrowLeft → goBack
  - ArrowRight → goForward
  - Home → goToStart
  - End → goToEnd
  - Space → toggle auto-play

UPDATE ROUTING (App.tsx):
- Add route: /history/:id → ReplayPage

UPDATE GameHistoryPage:
- Clicking a game row navigates to /history/{game.id}.

Verify:
1. Play a game, go to Game History, click on the game.
2. Replay viewer shows the starting position.
3. Forward/back buttons step through moves one at a time.
4. Board updates to reflect each position.
5. Move list highlights the current move and clicking a move jumps to it.
6. Keyboard arrows work.
7. Auto-play advances moves automatically.
8. Start/End buttons jump to beginning/end.
```
