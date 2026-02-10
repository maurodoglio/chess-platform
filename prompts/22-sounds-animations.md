# Prompt 22 — Sounds and Animations

## Context
All three game modes work. The chessboard is functional but lacks audio and visual polish. This step adds move sounds and piece animations to make the experience feel premium.

## What to Build
Sound effects for game events and smooth piece movement animations.

## Prompt

```text
Add sound effects and piece animations to the chess platform.

=== SOUNDS ===

INSTALL:
- Install howler.js (or use-sound) for audio playback.

SOUND FILES — /frontend/public/sounds/:
Create or source (from open-source chess projects like lichess — MIT licensed) short audio files:
- move.mp3       — soft wood tap (piece placed on board)
- capture.mp3    — louder thud (piece captured)
- check.mp3      — sharp ping or alert sound  
- castle.mp3     — double tap sound
- game-start.mp3 — short positive chime
- game-end.mp3   — resolution chime
- premove.mp3    — soft click
- illegal.mp3    — subtle error buzz

Note: If you can't source audio files, create them using the Web Audio API (generate short synthesized sounds):
- move: short sine wave click (440Hz, 50ms)
- capture: lower frequency thud (220Hz, 80ms) 
- check: higher ping (880Hz, 100ms)
- etc.

SOUND SERVICE — /services/sounds.ts:

class SoundService {
  private sounds: Map<string, Howl> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Preload all sounds
    const soundFiles = ['move', 'capture', 'check', 'castle', 'game-start', 'game-end', 'premove', 'illegal'];
    soundFiles.forEach(name => {
      this.sounds.set(name, new Howl({ src: [`/sounds/${name}.mp3`], volume: 0.5 }));
    });
  }

  play(sound: string): void {
    if (!this.enabled) return;
    this.sounds.get(sound)?.play();
  }

  toggle(): void { this.enabled = !this.enabled; }
  get isEnabled(): boolean { return this.enabled; }
}

export const soundService = new SoundService();

SOUND HOOK — /hooks/useGameSounds.ts:

function useGameSounds() {
  // Call the appropriate sound based on move type:
  const playMoveSound = (moveInfo: { isCapture: boolean; isCheck: boolean; isCastle: boolean }) => {
    if (moveInfo.isCheck) soundService.play('check');
    else if (moveInfo.isCastle) soundService.play('castle');
    else if (moveInfo.isCapture) soundService.play('capture');
    else soundService.play('move');
  };

  const playGameStart = () => soundService.play('game-start');
  const playGameEnd = () => soundService.play('game-end');
  const playIllegal = () => soundService.play('illegal');

  return { playMoveSound, playGameStart, playGameEnd, playIllegal };
}

INTEGRATE SOUNDS:
- In useOnlineGame: play sounds on MoveMade events (both own and opponent moves). Play game-start on GameStarted, game-end on GameOver.
- In useComputerGame: play sounds when player moves and when AI moves.
- In useLocalGame: play sounds on every move.
- On illegal move attempt (onMove returns false): play illegal sound.

SOUND TOGGLE:
- Add a 🔊/🔇 button in the Layout nav bar.
- Store preference in localStorage. Read on app load.

=== ANIMATIONS ===

PIECE MOVEMENT ANIMATION:
- react-chessboard supports animationDuration prop.
- Set animationDuration={150} for smooth piece sliding (150ms).
- This handles both drag-drop and click-to-move.

GAME START ANIMATION:
- When a game begins, briefly flash/highlight all squares in a wave pattern, or fade the board in.
- Simple approach: CSS transition on the board container (opacity 0 → 1 over 300ms).

GAME OVER ANIMATION:
- On game over, briefly flash the board border or overlay with the result color:
  - Win: green flash
  - Loss: red flash  
  - Draw: yellow flash
- Use CSS animation (300ms flash then fade).

CAPTURED PIECE ANIMATION:
- When a piece is captured, the new entry in the captured pieces list fades/slides in.
- Use CSS transition: opacity 0→1, translateY(5px)→0 over 200ms.

CHECK HIGHLIGHT ANIMATION:
- When king is in check, pulse the red highlight (subtle opacity oscillation).
- CSS animation: @keyframes pulse { 0% { opacity: 0.6 } 50% { opacity: 1 } 100% { opacity: 0.6 } }

Verify:
1. Making a move plays the appropriate sound.
2. Captures, checks, and castles have distinct sounds.
3. Game start and end have their own sounds.
4. Sound toggle works and persists across page loads.
5. Pieces slide smoothly when moved.
6. King check has a pulsing red highlight.
7. Game over shows a brief color flash.
```
