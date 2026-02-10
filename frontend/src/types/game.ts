export interface GameHistoryEntry {
  id: string;
  opponentName: string;
  opponentAvatar: string | null;
  playerColor: 'white' | 'black';
  playerResult: 'win' | 'loss' | 'draw';
  termination: string;
  timeControl: string;
  ratingBefore: number;
  ratingAfter: number;
  endedAt: string;
}

export interface GameHistoryResponse {
  data: {
    games: GameHistoryEntry[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

export interface GameDetail {
  id: string;
  whiteName: string;
  whiteAvatar: string | null;
  blackName: string;
  blackAvatar: string | null;
  timeControl: string;
  result: string;
  termination: string;
  pgn: string;
  finalFen: string;
  whiteRatingBefore: number;
  whiteRatingAfter: number;
  blackRatingBefore: number;
  blackRatingAfter: number;
  startedAt: string;
  endedAt: string;
}
