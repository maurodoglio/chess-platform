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
}

export interface MoveMadeEvent {
  move: string;
  san: string;
  fen: string;
  timeWhiteMs: number;
  timeBlackMs: number;
  moveNumber: number;
}

export interface GameOverEvent {
  result: 'white' | 'black' | 'draw';
  reason: string;
  ratingChange?: number;
  newRating?: number;
}

export interface IllegalMoveEvent {
  attemptedMove: string;
  reason: string;
}

export interface GameResyncedEvent {
  gameId: string;
  fen: string;
  moveHistory: string[];
  timeWhiteMs: number;
  timeBlackMs: number;
  turn: string;
  playerColor: 'white' | 'black';
  drawOffer: 'none' | 'white' | 'black';
}

export interface OpponentDisconnectedEvent {
  reconnectionDeadlineUtc: string;
}
