# Prompt 08 — SignalR GameHub + Connection Tracking

## Context
We have backend auth (JWT), a chess engine service, and a frontend that can authenticate. Now we need to set up the SignalR hub that will power all real-time gameplay. This step just sets up the hub infrastructure and connection tracking — no game logic yet.

## What to Build
A SignalR GameHub with JWT authentication, connection-to-user mapping, and basic connection lifecycle handling.

## Prompt

```text
Set up a SignalR hub in the ChessPlatform.Api project with authentication and connection tracking.

NUGET PACKAGES (if not already included):
- Microsoft.AspNetCore.SignalR (typically included with ASP.NET Core)

CONNECTION TRACKER — /Services/ConnectionTracker.cs:
A thread-safe service that maps users to their SignalR connection IDs.

public interface IConnectionTracker
{
    void AddConnection(Guid userId, string connectionId);
    void RemoveConnection(string connectionId);
    string? GetConnectionId(Guid userId);
    Guid? GetUserId(string connectionId);
    bool IsConnected(Guid userId);
}

Implementation:
- Use two ConcurrentDictionary instances:
  - _userToConnection: Guid → string
  - _connectionToUser: string → Guid
- AddConnection replaces any existing connection for the user (handles reconnects).
- RemoveConnection cleans up both dictionaries.
- Register as a singleton.

GAME HUB — /Hubs/GameHub.cs:
public class GameHub : Hub
{
    // Inject IConnectionTracker, ILogger<GameHub>

    public override async Task OnConnectedAsync()
    {
        // Extract user ID from JWT claims (Context.User)
        // If not authenticated, abort the connection
        // Register in ConnectionTracker
        // Log: "User {userId} connected with connectionId {connectionId}"
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Get userId from ConnectionTracker
        // Remove from ConnectionTracker
        // Log: "User {userId} disconnected"
        // (Game disconnection handling will be added in a later step)
    }

    // Placeholder methods (to be implemented in later steps):
    public async Task JoinMatchmaking(string timeControlId)
    {
        // Will be implemented in Prompt 10
        await Clients.Caller.SendAsync("Error", "Matchmaking not yet implemented");
    }

    public async Task LeaveMatchmaking()
    {
        await Clients.Caller.SendAsync("Error", "Matchmaking not yet implemented");
    }

    public async Task MakeMove(Guid gameId, string move)
    {
        await Clients.Caller.SendAsync("Error", "Game moves not yet implemented");
    }

    public async Task Resign(Guid gameId)
    {
        await Clients.Caller.SendAsync("Error", "Not yet implemented");
    }

    public async Task OfferDraw(Guid gameId)
    {
        await Clients.Caller.SendAsync("Error", "Not yet implemented");
    }

    public async Task AcceptDraw(Guid gameId)
    {
        await Clients.Caller.SendAsync("Error", "Not yet implemented");
    }

    public async Task DeclineDraw(Guid gameId)
    {
        await Clients.Caller.SendAsync("Error", "Not yet implemented");
    }
}

CONFIGURE SIGNALR in Program.cs:
- Add SignalR services: builder.Services.AddSignalR()
- Map the hub: app.MapHub<GameHub>("/hubs/game")
- The hub endpoint should require authentication.
- Configure SignalR to accept the JWT from the "auth_token" cookie AND from the "access_token" query string parameter (SignalR's JS client sends it as a query param for WebSocket connections).

HUB FILTER — /Hubs/GameHubFilter.cs:
Create a hub filter that catches unhandled exceptions, logs them, and sends a sanitized error to the caller:
  await Clients.Caller.SendAsync("Error", "An unexpected error occurred.")

Verify: 
- The SignalR hub is accessible at /hubs/game.
- An authenticated user can connect (test with a simple script or the frontend in the next step).
- An unauthenticated connection attempt is rejected.
- Connection/disconnection is logged.
```
