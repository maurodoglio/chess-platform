import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGameHub } from '../hooks/useGameHub';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { timeControlsByCategory, type TimeControl } from '../data/timeControls';
import GamePanel from '../components/GamePanel';
import GameOverDialog from '../components/GameOverDialog';
import ConnectionBanner from '../components/ConnectionBanner';
import type { GameStartedEvent, MatchmakingStatusEvent } from '../types/signalr';

type PageState = 'select' | 'searching' | 'playing';

export default function OnlineGamePage() {
  const { gameHub, connectionStatus } = useGameHub();
  const { showToast } = useToast();
  const [pageState, setPageState] = useState<PageState>('select');
  const [selectedTC, setSelectedTC] = useState<TimeControl | null>(null);
  const [gameData, setGameData] = useState<GameStartedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onGameStarted = (event: GameStartedEvent) => {
      clearTimer();
      setGameData(event);
      setPageState('playing');
    };

    const onMatchmakingStatus = (event: MatchmakingStatusEvent) => {
      if (event.status === 'cancelled') {
        clearTimer();
        setPageState('select');
      } else if (event.status === 'error') {
        clearTimer();
        setError('Matchmaking error. Please try again.');
        setPageState('select');
      }
    };

    const onError = (message: string) => {
      clearTimer();
      setError(message);
      showToast(message, 'error');
      setPageState('select');
    };

    gameHub.on('GameStarted', onGameStarted);
    gameHub.on('MatchmakingStatus', onMatchmakingStatus);
    gameHub.on('Error', onError);

    return () => {
      clearTimer();
      gameHub.off('GameStarted', onGameStarted);
      gameHub.off('MatchmakingStatus', onMatchmakingStatus);
      gameHub.off('Error', onError);
    };
  }, [gameHub, clearTimer]);

  const handleSelectTimeControl = async (tc: TimeControl) => {
    setError(null);
    setSelectedTC(tc);
    setSearchSeconds(0);
    setPageState('searching');

    timerRef.current = setInterval(() => setSearchSeconds(s => s + 1), 1000);

    try {
      await gameHub.joinMatchmaking(tc.id);
    } catch {
      clearTimer();
      setError('Failed to join matchmaking. Please try again.');
      setPageState('select');
    }
  };

  const handleCancel = async () => {
    clearTimer();
    try {
      await gameHub.leaveMatchmaking();
    } catch { /* ignore */ }
    setPageState('select');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (pageState === 'playing' && gameData) {
    return <OnlineGameView gameData={gameData} />;
  }

  if (pageState === 'searching') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <ConnectionBanner status={connectionStatus === 'reconnecting' ? 'reconnecting' : connectionStatus === 'disconnected' ? 'disconnected' : 'connected'} />
        <h1>⚔️ Play Online</h1>
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: '#16213e',
          borderRadius: '12px',
          maxWidth: '400px',
          marginInline: 'auto',
        }}>
          <p style={{ fontSize: '1.3rem', color: '#e0e0e0' }}>
            Searching for opponent<span className="animated-dots">...</span>
          </p>
          <p style={{ color: '#7c83ff', fontSize: '1.1rem', marginTop: '0.75rem' }}>
            {selectedTC?.name}
          </p>
          <p style={{ color: '#888', fontSize: '2rem', marginTop: '1rem', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(searchSeconds)}
          </p>
          <button
            onClick={handleCancel}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 2rem',
              background: 'transparent',
              border: '1px solid #555',
              color: '#ccc',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 'select' state
  const categories = [
    { key: 'bullet' as const, label: '🔫 Bullet', controls: timeControlsByCategory.bullet },
    { key: 'blitz' as const, label: '⚡ Blitz', controls: timeControlsByCategory.blitz },
    { key: 'rapid' as const, label: '🕐 Rapid', controls: timeControlsByCategory.rapid },
  ];

  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <h1>⚔️ Play Online</h1>

      {error && (
        <p style={{ color: '#ef4444', marginTop: '1rem', marginBottom: '1rem' }}>{error}</p>
      )}

      {connectionStatus === 'connecting' && (
        <p style={{ color: '#888', marginTop: '1rem' }}>Connecting to server...</p>
      )}

      <div style={{ maxWidth: '500px', marginInline: 'auto', marginTop: '2rem' }}>
        {categories.map(({ key, label, controls }) => (
          <div key={key} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '0.75rem' }}>{label}</h2>
            <div className="tc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
              {controls.map(tc => (
                <button
                  key={tc.id}
                  onClick={() => handleSelectTimeControl(tc)}
                  disabled={connectionStatus !== 'connected'}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#16213e',
                    border: '1px solid #2a3a5c',
                    color: '#e0e0e0',
                    borderRadius: '8px',
                    cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    minHeight: 44,
                    opacity: connectionStatus === 'connected' ? 1 : 0.5,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (connectionStatus === 'connected') {
                      e.currentTarget.style.background = '#1a2744';
                      e.currentTarget.style.borderColor = '#7c83ff';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#16213e';
                    e.currentTarget.style.borderColor = '#2a3a5c';
                  }}
                >
                  {tc.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Link to="/" style={{ color: '#7c83ff', marginTop: '2rem', display: 'inline-block' }}>← Back to Home</Link>
    </div>
  );
}

function OnlineGameView({ gameData }: { gameData: GameStartedEvent }) {
  const { user } = useAuth();
  const {
    gameState,
    playerColor,
    timeWhiteMs,
    timeBlackMs,
    isMyTurn,
    gameOver,
    drawOfferedByOpponent,
    opponentDisconnected,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    premove,
    setPremoveAction,
    clearPremove,
  } = useOnlineGame(gameData);

  return (
    <>
      {opponentDisconnected && !gameOver && (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          background: '#92400e',
          color: '#fff',
          fontSize: '0.85rem',
        }}>
          Opponent disconnected — waiting for reconnection...
        </div>
      )}
      <GamePanel
        gameState={gameState}
        playerColor={playerColor}
        timeWhiteMs={timeWhiteMs}
        timeBlackMs={timeBlackMs}
        playerName={user?.displayName ?? 'You'}
        playerAvatar={user?.avatarUrl ?? null}
        opponentName={gameData.opponentName}
        opponentAvatar={gameData.opponentAvatar}
        onMove={makeMove}
        onResign={resign}
        onOfferDraw={offerDraw}
        onAcceptDraw={acceptDraw}
        onDeclineDraw={declineDraw}
        isMyTurn={isMyTurn}
        drawOfferedByOpponent={drawOfferedByOpponent}
        gameOver={gameOver}
        premove={premove}
        onPremove={setPremoveAction}
        onClearPremove={clearPremove}
      />
      {gameOver && (
        <GameOverDialog result={gameOver.result} reason={gameOver.reason} playerColor={playerColor} />
      )}
    </>
  );
}
