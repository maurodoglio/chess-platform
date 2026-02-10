import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchGameHistory } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import type { GameHistoryEntry } from '../types/game';

function formatTimeControl(tc: string): string {
  const parts = tc.split('_');
  if (parts.length === 3) {
    const category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return `${category} ${parts[1]}+${parts[2]}`;
  }
  return tc;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const resultIndicator: Record<string, string> = {
  win: '🟢',
  loss: '🔴',
  draw: '⚪',
};

export default function GameHistoryPage() {
  const [games, setGames] = useState<GameHistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetchGameHistory(page, pageSize)
      .then((res) => {
        setGames(res.data.games);
        setTotalCount(res.data.totalCount);
      })
      .catch(() => {
        setGames([]);
        showToast('Failed to load game history', 'error');
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, showToast]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ccc' }}>
        <h1>📜 Game History</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (games.length === 0 && page === 1) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1>📜 Game History</h1>
        <p style={{ color: '#999', marginTop: '1rem' }}>No games played yet.</p>
        <Link to="/" style={{ color: '#7aa2f7', marginTop: '2rem', display: 'inline-block' }}>
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>📜 Game History</h1>
        <Link to="/" style={{ color: '#7aa2f7', textDecoration: 'none' }}>← Home</Link>
      </div>

      {/* Desktop/Tablet: table */}
      <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333', color: '#888', textAlign: 'left' }}>
            <th style={{ padding: '0.6rem 0.5rem' }}></th>
            <th style={{ padding: '0.6rem 0.5rem' }}>Opponent</th>
            <th style={{ padding: '0.6rem 0.5rem' }}>Result</th>
            <th style={{ padding: '0.6rem 0.5rem' }}>Time</th>
            <th style={{ padding: '0.6rem 0.5rem' }}>Rating</th>
            <th style={{ padding: '0.6rem 0.5rem' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, i) => {
            const ratingChange = g.ratingAfter - g.ratingBefore;
            const ratingStr = ratingChange > 0 ? `+${ratingChange}` : `${ratingChange}`;
            const ratingColor = ratingChange > 0 ? '#73daca' : ratingChange < 0 ? '#f7768e' : '#888';

            return (
              <tr
                key={g.id}
                onClick={() => navigate(`/history/${g.id}`)}
                style={{
                  cursor: 'pointer',
                  background: i % 2 === 0 ? '#1a1b26' : '#16161e',
                  borderBottom: '1px solid #222',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#24283b')}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#1a1b26' : '#16161e')}
              >
                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontSize: '1.1rem' }}>
                  {resultIndicator[g.playerResult]}
                </td>
                <td style={{ padding: '0.6rem 0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    {g.opponentAvatar && (
                      <img
                        src={g.opponentAvatar}
                        alt=""
                        style={{ width: 24, height: 24, borderRadius: '50%' }}
                      />
                    )}
                    <span style={{ color: '#c0caf5' }}>{g.opponentName}</span>
                  </span>
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: '#a9b1d6' }}>
                  {g.termination.charAt(0).toUpperCase() + g.termination.slice(1)}
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: '#a9b1d6' }}>
                  {formatTimeControl(g.timeControl)}
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: ratingColor, fontWeight: 600 }}>
                  {ratingStr}
                </td>
                <td style={{ padding: '0.6rem 0.5rem', color: '#565f89' }}>
                  {formatDate(g.endedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: card layout */}
      <div className="history-cards" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
        {games.map((g) => {
          const ratingChange = g.ratingAfter - g.ratingBefore;
          const ratingStr = ratingChange > 0 ? `+${ratingChange}` : `${ratingChange}`;
          const ratingColor = ratingChange > 0 ? '#73daca' : ratingChange < 0 ? '#f7768e' : '#888';

          return (
            <div
              key={g.id}
              onClick={() => navigate(`/history/${g.id}`)}
              style={{
                cursor: 'pointer',
                background: '#1a1b26',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{resultIndicator[g.playerResult]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#c0caf5', fontWeight: 600 }}>{g.opponentName}</span>
                  <span style={{ color: '#565f89', fontSize: '0.8rem' }}>
                    {g.termination.charAt(0).toUpperCase() + g.termination.slice(1)}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#565f89', marginTop: '0.2rem' }}>
                  {formatTimeControl(g.timeControl)} · {formatDate(g.endedAt)}
                </div>
              </div>
              <span style={{ color: ratingColor, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                {ratingStr}
              </span>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.4rem 1rem',
              background: page === 1 ? '#222' : '#333',
              color: page === 1 ? '#555' : '#ccc',
              border: 'none',
              borderRadius: 4,
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ color: '#888' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.4rem 1rem',
              background: page === totalPages ? '#222' : '#333',
              color: page === totalPages ? '#555' : '#ccc',
              border: 'none',
              borderRadius: 4,
              cursor: page === totalPages ? 'default' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
