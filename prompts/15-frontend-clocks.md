# Prompt 15 — Frontend Clock Display + Server Sync

## Context
The backend now manages clocks, deducts time, adds increments, and detects flag. The "MoveMade" events include `timeWhiteMs` and `timeBlackMs`. Now the frontend needs to display ticking clocks that sync with server updates.

## What to Build
A chess clock component that counts down locally between server updates, shows time in MM:SS (or SS.T when under 10 seconds), and visually indicates the active clock.

## Prompt

```text
Build the frontend chess clock component and integrate it with the online game flow.

CLOCK COMPONENT — /components/ChessClock.tsx:

Props:
interface ChessClockProps {
  timeMs: number;           // Current time from server (resynced on each move)
  isActive: boolean;        // Is this clock currently running?
  isPlayerClock: boolean;   // Is this the local player's clock? (for styling emphasis)
}

Implementation:
- Use useRef to track the last server time and the timestamp when it was received.
- Use requestAnimationFrame (or setInterval at 100ms) to count down locally when isActive.
- On each tick: displayTime = timeMs - (Date.now() - lastSyncTimestamp).
- When timeMs prop changes (server update), reset the sync point.
- Do NOT go below 0 — clamp to 0.

Display format:
- ≥ 60 seconds: "M:SS" (e.g., "5:00", "12:34")
- 10–59 seconds: "0:SS" (e.g., "0:45")
- < 10 seconds: "0:S.T" with tenths of seconds (e.g., "0:9.3", "0:0.1")

Styling:
- Large, bold, monospace font.
- Active clock: bright text (white), slightly larger or highlighted background.
- Inactive clock: dimmer text (gray).
- Under 10 seconds: red text with subtle pulse animation.
- isPlayerClock on bottom, opponent clock on top.

GAME PANEL COMPONENT — /components/GamePanel.tsx:

A panel that wraps the chessboard with clocks, player info, move list, and action buttons.

Props:
interface GamePanelProps {
  // Game state
  gameState: GameState;
  playerColor: PieceColor;
  // Clocks
  timeWhiteMs: number;
  timeBlackMs: number;
  // Player info
  playerName: string;
  playerAvatar: string | null;
  opponentName: string;
  opponentAvatar: string | null;
  // Callbacks
  onMove: (from: string, to: string, promotion?: string) => boolean;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  // State flags
  isMyTurn: boolean;
  drawOfferedByOpponent: boolean;
  gameOver: GameOverEvent | null;
}

Layout (desktop):
┌─────────────────────────────────────────┐
│  [Opponent Avatar] Opponent Name  [5:00]│  ← opponent clock
│  Captured: ♟♟♝                    +2    │
├─────────────────────────────────────────┤
│                                         │
│             Chessboard                  │
│                                         │
├─────────────────────────────────────────┤
│  [Your Avatar] Your Name         [4:32] │  ← your clock
│  Captured: ♙                      -2    │
├─────────────────────────────────────────┤
│  1. e4 e5  2. Nf3 Nc6  3. Bb5 ...     │  ← move list
├─────────────────────────────────────────┤
│  [Resign]  [Offer Draw]                │
└─────────────────────────────────────────┘

- Opponent's info + clock is above the board (from the player's perspective).
- Player's info + clock is below the board.
- If playerColor is black, the opponent (white) is on top and clocks are swapped accordingly.

CAPTURED PIECES — /components/CapturedPieces.tsx:
- Derive captured pieces by comparing the current position to the starting position.
- Parse the FEN to count pieces on the board vs standard starting material.
- Display captured pieces as small Unicode symbols grouped by type (pawns, then pieces).
- Show material advantage as "+N" or "-N".

MOVE LIST — /components/MoveList.tsx:
- Takes an array of SAN moves.
- Renders in two-column format: "1. e4 e5  2. Nf3 Nc6"
- Auto-scrolls to the latest move.
- Uses a monospace font.

UPDATE ONLINE GAME PAGE:
- Replace the raw chessboard + buttons with the GamePanel component.
- Pass all the necessary props from useOnlineGame hook.

UPDATE useOnlineGame HOOK:
- Track timeWhiteMs and timeBlackMs from MoveMade events.
- Initialize from GameStartedEvent.initialTimeMs.
- Determine which clock is active based on whose turn it is.

Verify:
- Clocks tick down smoothly during a game.
- When a move is made, clocks resync with server values.
- Under 10 seconds, tenths of seconds are displayed.
- Captured pieces and material advantage are shown correctly.
- Move list scrolls to the latest move.
```
