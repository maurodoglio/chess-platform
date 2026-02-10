# Prompt 14 — Server-Side Clocks + Flag Detection

## Context
Online games work end-to-end but time is not yet enforced. Clocks need to tick on the server (authoritative), detect flag (timeout), and apply increments. Currently TimeWhiteMs/TimeBlackMs exist in ActiveGame but are never decremented.

## What to Build
Server-side clock management with time deduction on moves, increment application, flag detection via a background timer, and latency compensation.

## Prompt

```text
Implement server-side chess clock logic in the backend. The server is the authority on time.

UPDATE ACTIVE GAME — /Models/ActiveGame.cs:
Add:
  public DateTime? GameStartedTimestamp { get; set; }   // When white's clock started
  public bool ClockRunning { get; set; } = false;       // Clock starts after white's first move

CLOCK SERVICE — /Services/ClockService.cs:

public interface IClockService
{
    // Called when a move is made. Deducts elapsed time from the mover's clock,
    // adds increment, and starts the opponent's clock.
    // Returns (timeWhiteMs, timeBlackMs) after update.
    // Returns null if the mover has flagged (time ran out).
    ClockUpdateResult UpdateClockOnMove(ActiveGame game);

    // Check if any active game has flagged. Called periodically.
    // Returns list of (gameId, flaggedPlayerId) for games where time expired.
    List<(Guid gameId, Guid flaggedPlayerId)> CheckFlags(IEnumerable<ActiveGame> activeGames);
}

public class ClockUpdateResult
{
    public long TimeWhiteMs { get; set; }
    public long TimeBlackMs { get; set; }
    public bool Flagged { get; set; }       // True if the mover ran out of time
    public Guid? FlaggedPlayerId { get; set; }
}

IMPLEMENTATION:
- UpdateClockOnMove:
  1. Calculate elapsed time since LastMoveTimestamp (or GameStartedTimestamp for the first move).
  2. Subtract elapsed from the current mover's clock.
  3. If clock <= 0, set to 0, mark as flagged.
  4. If not flagged, add IncrementMs to the mover's clock.
  5. Set LastMoveTimestamp to DateTime.UtcNow.
  6. Update game.TimeWhiteMs and game.TimeBlackMs.
  7. On the very first move (white's first move), start the clock (set ClockRunning = true).

- CheckFlags:
  1. For each active game where ClockRunning == true:
  2. Calculate how much time has elapsed since LastMoveTimestamp.
  3. Determine whose clock is running (the current turn's player).
  4. If their remaining time minus elapsed <= 0, they've flagged.

LATENCY COMPENSATION:
- When receiving a move, estimate network transit time as half the round-trip time.
- For MVP, use a simple approach: subtract a fixed grace of 100ms from the deducted time (clamped to 0).
- This prevents penalizing players for network latency.

UPDATE GAME STATE MANAGER:
- In TryMakeMove: after validating the move with the chess engine, call IClockService.UpdateClockOnMove().
  - If the player flagged, return the move as legal but set the game result to timeout.
  - Include updated times in the MoveResult or return them separately.

FLAG DETECTION BACKGROUND SERVICE — /Services/FlagDetectionService.cs:
- BackgroundService that runs every 500ms.
- Calls IClockService.CheckFlags() on all active games.
- For each flagged game:
  1. Set the game as completed with timeout result.
  2. Use IHubContext<GameHub> to send "GameOver" to both players:
     { result: opponent wins, reason: "timeout" }
  3. Remove the game from active games.

UPDATE SIGNALR HUB — MakeMove method:
- After a successful move, include timeWhiteMs and timeBlackMs in the "MoveMade" event sent to both players.

REGISTER:
- IClockService as singleton.
- FlagDetectionService as hosted service.

UNIT TESTS:
- Clock deduction: after a move with 1 second elapsed, clock is reduced by ~1000ms.
- Increment: after a move, mover's clock has increment added.
- Flag: if elapsed time > remaining time, flagged is true.
- First move: clock doesn't run until white makes the first move.
- Latency grace: at least 100ms is not counted against the player.

Verify: In a real game between two tabs, clocks tick down. When time runs out, the game ends with "timeout" result.
```
