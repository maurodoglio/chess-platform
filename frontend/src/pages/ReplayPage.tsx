import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchGame } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useReplay from '../hooks/useReplay';
import useBoardSize from '../hooks/useBoardSize';
import ChessBoard from '../components/ChessBoard';
import MoveList from '../components/MoveList';
import type { GameDetail } from '../types/game';
import type { PieceColor } from '../types/chess';

function formatTimeControl(tc: string): string {
  const parts = tc.split('_');
  if (parts.length === 3) {
    const category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return `${category} ${parts[1]}+${parts[2]}`;
  }
  return tc;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getResultText(game: GameDetail): string {
  if (game.result === '1-0') return `White wins by ${game.termination}`;
  if (game.result === '0-1') return `Black wins by ${game.termination}`;
  return `Draw by ${game.termination}`;
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  background: '#1a1b26',
  border: '1px solid #333',
  color: disabled ? '#444' : '#c0caf5',
  fontSize: '1.2rem',
  width: 44,
  height: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  cursor: disabled ? 'default' : 'pointer',
  filter: disabled ? 'none' : 'brightness(1)',
  transition: 'filter 0.15s',
});

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchGame(id)
      .then(setGame)
      .catch(() => {
        setError(true);
        showToast('Failed to load game', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, showToast]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ccc' }}>
        <p>Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2 style={{ color: '#f7768e' }}>Game not found</h2>
        <Link to="/history" style={{ color: '#7aa2f7', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to History
        </Link>
      </div>
    );
  }

  return <ReplayView game={game} username={user?.displayName ?? null} />;
}

function ReplayView({ game, username }: { game: GameDetail; username: string | null }) {
  const replay = useReplay(game.pgn);
  const boardSize = useBoardSize();

  // Determine board orientation from the logged-in user's perspective
  const playerColor: PieceColor =
    username && game.blackName === username ? 'black' : 'white';

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          replay.goBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          replay.goForward();
          break;
        case 'Home':
          e.preventDefault();
          replay.goToStart();
          break;
        case 'End':
          e.preventDefault();
          replay.goToEnd();
          break;
        case ' ':
          e.preventDefault();
          replay.toggleAutoPlay();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [replay]);

  // MoveList click: index is 0-based move index, but useReplay uses 0=start, so offset by 1
  const handleMoveClick = (moveIndex: number) => {
    replay.goToMove(moveIndex + 1);
  };

  const gameState = {
    fen: replay.currentFen,
    turn: 'white' as const,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    isGameOver: false,
    moveHistory: replay.moves.slice(0, replay.currentMoveIndex),
    lastMove: replay.lastMove,
  };

  return (
    <div style={{ maxWidth: Math.max(boardSize + 60, 400), margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <Link to="/history" style={{ color: '#7aa2f7', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to History
        </Link>
      </div>

      {/* Player header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color: '#c0caf5' }}>
          ♔ {game.whiteName} ({game.whiteRatingBefore} → {game.whiteRatingAfter})
        </span>
        <span style={{ color: '#888' }}>vs</span>
        <span style={{ color: '#c0caf5' }}>
          ♚ {game.blackName} ({game.blackRatingBefore} → {game.blackRatingAfter})
        </span>
      </div>

      {/* Result */}
      <div style={{ color: '#a9b1d6', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        {getResultText(game)}
      </div>

      {/* Time control + date */}
      <div style={{ color: '#565f89', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {formatTimeControl(game.timeControl)} · {formatDate(game.endedAt)}
      </div>

      {/* Chess board */}
      <ChessBoard
        gameState={gameState}
        playerColor={playerColor}
        interactive={false}
        boardWidth={boardSize}
      />

      {/* Replay controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '0.75rem 0' }}>
        <button
          style={btnStyle(replay.isAtStart)}
          disabled={replay.isAtStart}
          onClick={replay.goToStart}
          onMouseEnter={(e) => { if (!replay.isAtStart) e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Go to start (Home)"
        >
          ⏮
        </button>
        <button
          style={btnStyle(replay.isAtStart)}
          disabled={replay.isAtStart}
          onClick={replay.goBack}
          onMouseEnter={(e) => { if (!replay.isAtStart) e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Previous move (←)"
        >
          ◀
        </button>
        <button
          style={btnStyle(false)}
          onClick={replay.toggleAutoPlay}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Auto-play (Space)"
        >
          {replay.isAutoPlaying ? '⏸' : '▶️'}
        </button>
        <button
          style={btnStyle(replay.isAtEnd)}
          disabled={replay.isAtEnd}
          onClick={replay.goForward}
          onMouseEnter={(e) => { if (!replay.isAtEnd) e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Next move (→)"
        >
          ▶
        </button>
        <button
          style={btnStyle(replay.isAtEnd)}
          disabled={replay.isAtEnd}
          onClick={replay.goToEnd}
          onMouseEnter={(e) => { if (!replay.isAtEnd) e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Go to end (End)"
        >
          ⏭
        </button>
      </div>

      {/* Move list */}
      <MoveList
        moves={replay.moves}
        currentMoveIndex={replay.currentMoveIndex > 0 ? replay.currentMoveIndex - 1 : undefined}
        onMoveClick={handleMoveClick}
      />
    </div>
  );
}
