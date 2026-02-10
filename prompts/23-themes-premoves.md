# Prompt 23 — Board Themes + Premoves

## Context
The game has sounds and basic animations. Now we add visual customization (board and piece themes) and premoves — a key competitive feature where players queue their next move while waiting for the opponent.

## What to Build
Board color themes, piece set options, a settings panel, and the premove system.

## Prompt

```text
Add board/piece theming and the premove system.

=== THEMES ===

THEME TYPES — /types/themes.ts:

export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;     // CSS color
  darkSquare: string;      // CSS color
  lastMoveHighlight: string;  // with opacity
  selectedHighlight: string;
}

export interface PieceSet {
  id: string;
  name: string;
  // react-chessboard uses piece image URLs or built-in sets
}

THEME DATA — /data/themes.ts:

export const boardThemes: BoardTheme[] = [
  {
    id: 'green',
    name: 'Classic Green',
    lightSquare: '#eeeed2',
    darkSquare: '#769656',
    lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
    selectedHighlight: 'rgba(20, 85, 30, 0.5)',
  },
  {
    id: 'brown',
    name: 'Wooden Brown',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
    selectedHighlight: 'rgba(20, 85, 30, 0.5)',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    lightSquare: '#dee3e6',
    darkSquare: '#8ca2ad',
    lastMoveHighlight: 'rgba(0, 150, 255, 0.3)',
    selectedHighlight: 'rgba(0, 100, 200, 0.4)',
  },
];

export const pieceSets: PieceSet[] = [
  { id: 'default', name: 'Classic' },
  { id: 'neo', name: 'Neo' },
  { id: 'pixel', name: 'Pixel' },
];

THEME CONTEXT — /contexts/ThemeContext.tsx:

- Store selected boardTheme and pieceSet in context + localStorage.
- Defaults: 'green' board, 'default' pieces.
- Provide: currentBoardTheme, currentPieceSet, setBoardTheme, setPieceSet.

SETTINGS PANEL — /components/SettingsPanel.tsx:

A slide-out panel or modal accessible from the nav bar (⚙️ icon):
- Board Theme: show 3 clickable color swatches with name labels. Active theme has a checkmark.
- Piece Set: show 3 options as clickable buttons. Active has a checkmark.
- Sound: on/off toggle (reuse the sound service).
- Changes apply instantly (preview on the active board if in a game).

UPDATE CHESSBOARD COMPONENT:
- Read theme from ThemeContext.
- Apply customDarkSquareStyle={{ backgroundColor: theme.darkSquare }}
- Apply customLightSquareStyle={{ backgroundColor: theme.lightSquare }}
- Apply last move and selection highlight colors from theme.
- For piece sets: if react-chessboard supports custom piece images, use them. Otherwise, note this as a future enhancement and use the default set.

=== PREMOVES ===

PREMOVE HOOK — /hooks/usePremove.ts:

function usePremove(gameState: GameState, playerColor: PieceColor) {
  const [premove, setPremove] = useState<{ from: string; to: string; promotion?: string } | null>(null);

  // Set a premove: called when the player tries to move on opponent's turn
  const setPremoveAction = (from: string, to: string, promotion?: string) => {
    setPremove({ from, to, promotion });
  };

  // Clear premove
  const clearPremove = () => setPremove(null);

  // Execute premove: called after opponent moves
  // Check if the premove is still legal in the new position
  // If legal, return the premove. If not, clear it and return null.
  const tryExecutePremove = (currentFen: string): { from: string; to: string; promotion?: string } | null => {
    if (!premove) return null;
    // Use chess.js to validate the premove in the current position
    // If legal, clear the premove and return it
    // If illegal, clear and return null
  };

  return { premove, setPremoveAction, clearPremove, tryExecutePremove };
}

INTEGRATE PREMOVES INTO CHESSBOARD:
- When it's NOT the player's turn and the player clicks/drags a piece:
  - Instead of rejecting the move, call setPremoveAction.
  - Draw the premove visually:
    - Highlight the from/to squares with a translucent blue/purple overlay.
    - Optionally show the piece ghosted on the target square.
  - Use customSquareStyles for premove highlights.
- Right-click anywhere: clearPremove.
- When opponent moves (MoveMade received):
  - Call tryExecutePremove with the new FEN.
  - If it returns a move, automatically submit it (call makeMove).
  - Play the premove sound.

INTEGRATE INTO useOnlineGame:
- After receiving a "MoveMade" event, check for premove execution.
- If premove executes, the player's move is sent immediately (very fast response time).

Verify:
1. ⚙️ Settings panel opens from nav bar.
2. Switching board theme instantly changes board colors.
3. Theme choice persists across page reloads (localStorage).
4. In an online game, making a move on opponent's turn sets a premove.
5. Premove squares are highlighted in blue/purple.
6. When opponent moves, the premove executes automatically (if still legal).
7. If the premove is no longer legal (opponent's move changed the situation), it's silently cancelled.
8. Right-click cancels a premove.
```
