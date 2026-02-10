import * as signalR from '@microsoft/signalr';

class GameHubService {
  private connection: signalR.HubConnection | null = null;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/game', {
        accessTokenFactory: () => sessionStorage.getItem('auth_token') || '',
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Re-register all event handlers on the new connection
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.connection!.on(event, handler);
      });
    });

    this.connection.onreconnecting(() => this.emit('_connectionStatus', 'reconnecting'));
    this.connection.onreconnected(() => this.emit('_connectionStatus', 'connected'));
    this.connection.onclose(() => this.emit('_connectionStatus', 'disconnected'));

    await this.connection.start();
    this.emit('_connectionStatus', 'connected');
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
  }

  async joinMatchmaking(timeControlId: string): Promise<void> {
    await this.connection?.invoke('JoinMatchmaking', timeControlId);
  }
  async leaveMatchmaking(): Promise<void> {
    await this.connection?.invoke('LeaveMatchmaking');
  }
  async makeMove(gameId: string, move: string): Promise<void> {
    await this.connection?.invoke('MakeMove', gameId, move);
  }
  async resign(gameId: string): Promise<void> {
    await this.connection?.invoke('Resign', gameId);
  }
  async offerDraw(gameId: string): Promise<void> {
    await this.connection?.invoke('OfferDraw', gameId);
  }
  async acceptDraw(gameId: string): Promise<void> {
    await this.connection?.invoke('AcceptDraw', gameId);
  }
  async declineDraw(gameId: string): Promise<void> {
    await this.connection?.invoke('DeclineDraw', gameId);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, new Set());
    this.eventHandlers.get(event)!.add(callback);
    this.connection?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.eventHandlers.get(event)?.delete(callback);
    this.connection?.off(event, callback);
  }

  private emit(event: string, ...args: any[]) {
    this.eventHandlers.get(event)?.forEach(h => h(...args));
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

export const gameHub = new GameHubService();
