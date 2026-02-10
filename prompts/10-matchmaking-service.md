# Prompt 10 — Matchmaking Service + SignalR Integration

## Context
We have a GameHub, connection tracking, a chess engine, and a game state manager. Now we need matchmaking — the service that pairs players by rating and creates games. This step also wires matchmaking into the SignalR hub so players can join a queue and get paired.

## What to Build
A matchmaking queue service with rating-based pairing and progressive range expansion. Wire it into the GameHub's JoinMatchmaking/LeaveMatchmaking methods.

## Prompt

```text
Implement the matchmaking service and connect it to the SignalR GameHub.

QUEUE ENTRY MODEL — /Models/QueueEntry.cs:

public class QueueEntry
{
    public Guid UserId { get; set; }
    public string ConnectionId { get; set; }
    public int Rating { get; set; }
    public string TimeControlId { get; set; }
    public DateTime JoinedAt { get; set; }
}

MATCHMAKING SERVICE — /Services/MatchmakingService.cs:

public interface IMatchmakingService
{
    // Add a player to the queue. Returns false if already in queue or in a game.
    bool JoinQueue(QueueEntry entry);

    // Remove a player from the queue.
    bool LeaveQueue(Guid userId);

    // Check if a player is in the queue.
    bool IsInQueue(Guid userId);

    // Try to find a match for all queued players. Returns list of matched pairs.
    List<(QueueEntry Player1, QueueEntry Player2)> FindMatches();
}

IMPLEMENTATION:
- Use ConcurrentDictionary<Guid, QueueEntry> for the queue.
- JoinQueue: Reject if already in queue or if IGameStateManager.GetGameByPlayer returns a game.
- FindMatches algorithm:
  1. Group entries by timeControlId.
  2. Within each group, sort by JoinedAt (oldest first).
  3. For each unmatched entry, find the closest-rated opponent within the allowed range.
  4. Allowed range: base ±100, plus ±50 for every 5 seconds waited (calculated from JoinedAt), capped at ±500.
  5. If a match is found, pair them and remove both from the queue.
  6. Return the list of pairs.
- Register as singleton.

MATCHMAKING BACKGROUND SERVICE — /Services/MatchmakingBackgroundService.cs:

A hosted background service (IHostedService / BackgroundService) that:
1. Runs every 2 seconds.
2. Calls IMatchmakingService.FindMatches().
3. For each matched pair:
   a. Determine colors (random).
   b. Call IGameStateManager.CreateGame().
   c. Use IHubContext<GameHub> to send "GameStarted" to both players with:
      { gameId, opponentName, opponentAvatar, playerColor, timeControlId, initialTimeMs }
   d. Fetch opponent display names from the database (inject IServiceScopeFactory to create a scoped DbContext).
4. Log each match: "Matched {player1} ({rating1}) vs {player2} ({rating2}) for {timeControl}".

UPDATE GAME HUB — /Hubs/GameHub.cs:

Replace the JoinMatchmaking placeholder:
public async Task JoinMatchmaking(string timeControlId)
{
    // Validate timeControlId exists in TimeControls.All
    // Get userId from claims
    // Check player is not already in an **active** game (must check game.Status == Active,
    // not just whether GetGameByPlayer returns non-null — completed games remain in the
    // _playerToGame mapping and would incorrectly block new matchmaking)
    // Get player's rating for this time control's category from the database
    // Create QueueEntry and call IMatchmakingService.JoinQueue()
    // If failed (already in queue), send error to caller
    // If success, send MatchmakingStatus { status: "searching", estimatedWaitSec: null } to caller
}

Replace the LeaveMatchmaking placeholder:
public async Task LeaveMatchmaking()
{
    // Get userId, call IMatchmakingService.LeaveQueue()
    // Send MatchmakingStatus { status: "cancelled" } to caller
}

Update OnDisconnectedAsync:
    // If player is in matchmaking queue, remove them
    // (Game disconnection will be handled in a later step)

REGISTER:
- Register MatchmakingService as singleton.
- Register MatchmakingBackgroundService as a hosted service.

UNIT TESTS:
- JoinQueue adds player. Duplicate join rejected.
- LeaveQueue removes player.
- FindMatches pairs two players with close ratings.
- FindMatches does not pair players with very different ratings (initially).
- Range expansion: after simulating time passage, wider ratings get matched.
- Players in different time controls are not paired.

Verify: Two authenticated users connecting to the SignalR hub and calling JoinMatchmaking with the same time control get paired and both receive a "GameStarted" event.
```
