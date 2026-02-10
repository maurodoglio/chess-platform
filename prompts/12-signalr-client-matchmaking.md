# Prompt 12 — Frontend SignalR Client + Matchmaking UI

## Context
We have a working chessboard component and backend matchmaking via SignalR. Now we connect the frontend to SignalR and build the matchmaking UI where players select a time control and wait for an opponent.

## What to Build
A SignalR client service, a connection hook, and the matchmaking screen on the Online Game page.

## Prompt

```text
Create the frontend SignalR client and build the matchmaking UI for online play.

SIGNALR SERVICE — /services/signalr.ts:

import * as signalR from '@microsoft/signalr';

class GameHubService {
  private connection: signalR.HubConnection | null = null;

  // Build and start the connection
  async connect(): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/game', {
        // Pass per-window token from sessionStorage for dev login auth.
        // For OAuth, token is empty so cookie fallback is used.
        accessTokenFactory: () => sessionStorage.getItem('auth_token') || '',
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register lifecycle callbacks
    this.connection.onreconnecting(() => { /* emit event */ });
    this.connection.onreconnected(() => { /* emit event */ });
    this.connection.onclose(() => { /* emit event */ });

    await this.connection.start();
  }

  async disconnect(): Promise<void> { ... }

  // Send methods (match SignalR hub methods):
  async joinMatchmaking(timeControlId: string): Promise<void> { ... }
  async leaveMatchmaking(): Promise<void> { ... }
  async makeMove(gameId: string, move: string): Promise<void> { ... }
  async resign(gameId: string): Promise<void> { ... }
  async offerDraw(gameId: string): Promise<void> { ... }
  async acceptDraw(gameId: string): Promise<void> { ... }
  async declineDraw(gameId: string): Promise<void> { ... }

  // Event subscription:
  on(event: string, callback: (...args: any[]) => void): void { ... }
  off(event: string, callback: (...args: any[]) => void): void { ... }

  get isConnected(): boolean { ... }
}

export const gameHub = new GameHubService();  // Singleton

SIGNALR HOOK — /hooks/useGameHub.ts:

function useGameHub() {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    // Connect on mount. If already connected (singleton), just update status.
    // Do NOT disconnect on unmount — the singleton persists across page navigations.
    // React StrictMode double-mounts in dev, and disconnecting during cleanup
    // kills the connection for the second mount, leaving invoke() calls silently
    // failing (this.connection?.invoke() on null).
    return () => { /* unsubscribe status handler only, don't disconnect */ };
  }, []);

  return { gameHub, connectionStatus };
}

SIGNALR TYPES — /types/signalr.ts:

export interface GameStartedEvent {
  gameId: string;
  opponentName: string;
  opponentAvatar: string | null;
  playerColor: 'white' | 'black';
  timeControlId: string;
  initialTimeMs: number;
}

export interface MatchmakingStatusEvent {
  status: 'searching' | 'cancelled' | 'error';
  estimatedWaitSec: number | null;
}

(Add other event types as stubs — MoveMade, GameOver, etc. — they'll be filled in later steps.)

MATCHMAKING UI — Update /pages/OnlineGamePage.tsx:

States: 'select' | 'searching' | 'playing'

When state is 'select':
- Title: "Play Online"
- Subtitle: "Choose a time control"
- Grid of time control buttons (one per TimeControl):
  - Each button shows: name (e.g., "Blitz 5+0"), base time, increment
  - Grouped visually by category: Bullet | Blitz | Rapid
  - Styled as selectable cards with hover effects
- Clicking a time control:
  1. Set state to 'searching'
  2. Connect to SignalR (if not already connected)
  3. Call gameHub.joinMatchmaking(timeControlId)

When state is 'searching':
- Centered display: "Searching for opponent..."
- Animated spinner/dots
- Show the selected time control
- Elapsed time counter (how long they've been searching)
- "Cancel" button → calls gameHub.leaveMatchmaking(), sets state back to 'select'

When state is 'playing':
- (Will be built in the next step — for now, just show "Game starting!" when GameStarted is received)

Listen to events:
- "GameStarted" → transition to 'playing' state, store the GameStartedEvent data.
- "MatchmakingStatus" → update UI based on status.
- "Error" → show error message, return to 'select'.

TIME CONTROLS DATA — /data/timeControls.ts:
Export the list of available time controls matching the backend:
[
  { id: 'bullet_1_0', name: 'Bullet 1+0', category: 'bullet', baseTimeMs: 60000, incrementMs: 0 },
  { id: 'bullet_2_1', name: 'Bullet 2+1', category: 'bullet', baseTimeMs: 120000, incrementMs: 1000 },
  ... (all 7)
]

Verify:
- OnlineGamePage shows time control selection grid.
- Clicking a time control connects to SignalR and shows "Searching..." UI.
- Cancel button stops searching and returns to selection.
- (Full game flow will be tested in the next step once two browser tabs are used.)
```
