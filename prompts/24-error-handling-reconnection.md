# Prompt 24 — Error Handling + Reconnection Logic

## Context
The game is feature-complete with all three modes, sounds, themes, and premoves. Now we need to make it robust — handle disconnections gracefully, resync game state, and show clear error feedback.

## What to Build
SignalR reconnection handling, game state resync on reconnect, disconnection timers, and user-facing error notifications.

## Prompt

```text
Implement comprehensive error handling and reconnection logic for the chess platform.

=== BACKEND — DISCONNECTION HANDLING ===

UPDATE GAME HUB — OnDisconnectedAsync:
When a player disconnects during an active game:
1. Find their active game via IGameStateManager.GetGameByPlayer().
2. If they're in a game:
   a. Clear their ConnectionId on the ActiveGame.
   b. Start a 60-second reconnection timer (use a CancellationTokenSource stored on the game).
   c. Send "OpponentDisconnected" { reconnectionDeadlineUtc } to the connected opponent.
3. If they're in matchmaking, remove from queue.

UPDATE GAME HUB — OnConnectedAsync:
When a player reconnects:
1. Check if they have an active game (IGameStateManager.GetGameByPlayer()).
2. If yes:
   a. Update their ConnectionId on the ActiveGame.
   b. Cancel the reconnection timer.
   c. Send "OpponentReconnected" {} to the opponent.
   d. Send full game state to the reconnecting player:
      "GameResynced" { gameId, fen, moveHistory, timeWhiteMs, timeBlackMs, turn, opponentName, opponentAvatar, playerColor, drawOffer }
   e. This allows the client to rebuild the board from current state.

RECONNECTION TIMER SERVICE — /Services/ReconnectionTimerService.cs:

public interface IReconnectionTimerService
{
    void StartTimer(Guid gameId, Guid disconnectedPlayerId, int timeoutSeconds = 60);
    void CancelTimer(Guid gameId);
}

Implementation:
- Use a ConcurrentDictionary<Guid, CancellationTokenSource> for active timers.
- StartTimer: create a Task.Delay with the CancellationToken. On expiry:
  1. End the game as a forfeit (disconnected player loses).
  2. Send "GameOver" { result, reason: "abandonment" } to the connected player.
  3. Persist the game and update ratings.
  4. Clean up.
- CancelTimer: cancel the CTS and remove from dictionary.

=== FRONTEND — RECONNECTION UI ===

CONNECTION STATUS BANNER — /components/ConnectionBanner.tsx:
- A thin banner at the top of the page (similar to "You are offline" banners).
- States:
  - 'connected': no banner shown.
  - 'reconnecting': yellow banner "Reconnecting..." with animated dots.
  - 'disconnected': red banner "Connection lost. Attempting to reconnect..." with a manual "Reconnect" button.

UPDATE useGameHub:
- Track connection status changes from the SignalR service.
- On reconnect: if in a game, listen for "GameResynced" event and restore full game state.

OPPONENT DISCONNECT UI:
- When "OpponentDisconnected" is received:
  - Show a notice on the game screen: "Opponent disconnected. They have 60 seconds to reconnect."
  - Show a countdown timer.
  - Clocks pause (server handles this — flag detection skips games with a disconnected player).
- When "OpponentReconnected" is received:
  - Clear the notice, resume normal gameplay.

GAME STATE RESYNC:
- Update useOnlineGame to handle the "GameResynced" event:
  - Reinitialize the chess.js instance from the received FEN.
  - Rebuild the move history.
  - Reset clocks to the received times.
  - Resume normal gameplay.

=== ERROR TOASTS ===

TOAST SYSTEM — /components/Toast.tsx + /contexts/ToastContext.tsx:

Simple toast notification system:
- ToastProvider wraps the app.
- useToast() hook returns: showToast(message, type) where type = 'info' | 'success' | 'error' | 'warning'.
- Toasts appear in the top-right corner, stack vertically.
- Auto-dismiss after 4 seconds (errors after 6 seconds).
- CSS transitions for slide-in/fade-out.

USE TOASTS for:
- "Illegal move" → error toast.
- "Draw offered to opponent" → info toast.
- "Opponent declined your draw offer" → info toast.
- "Game aborted" → info toast.
- API errors (game history fetch failure, etc.) → error toast.
- SignalR "Error" events → error toast.

=== STOCKFISH ERROR HANDLING ===

- If Stockfish WASM fails to load:
  - Show error toast: "Chess engine failed to load. Please refresh the page."
  - Disable the "Play vs Computer" card on the home page (or show a warning icon).
  - In ComputerGamePage: show a full-page error with "Refresh" button instead of the game.

=== SERVER-SIDE ERROR HANDLING ===

GLOBAL EXCEPTION HANDLER — Update GameHubFilter:
- Catch all unhandled exceptions in hub methods.
- Log full exception at ERROR level.
- Send sanitized "Error" event to caller: "An unexpected error occurred."
- Do NOT leak stack traces or internal details.

API ERROR HANDLING:
- Add global exception middleware for REST endpoints.
- Return consistent error envelope: { data: null, error: { code: "INTERNAL_ERROR", message: "..." } }
- Log all 500s at ERROR level.

Verify:
1. During an online game, disconnect one player's network (or close the tab).
2. The other player sees "Opponent disconnected" with countdown.
3. If the disconnected player refreshes and logs back in, the game resumes with correct state.
4. If the timer expires, the connected player wins by abandonment.
5. Toast notifications appear for draw offers, illegal moves, errors.
6. Reconnection banner shows during SignalR reconnection attempts.
```
