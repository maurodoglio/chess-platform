import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useComputerGame, type ComputerGameConfig } from '../hooks/useComputerGame';
import { timeControlsByCategory } from '../data/timeControls';
import GamePanel from '../components/GamePanel';
import GameOverDialog from '../components/GameOverDialog';
import type { Difficulty } from '../services/stockfishService';
import type { PieceColor } from '../types/chess';

type Phase = 'setup' | 'playing';
type ColorChoice = 'white' | 'black' | 'random';

export default function ComputerGamePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<ComputerGameConfig | null>(null);

  const handleStart = (cfg: ComputerGameConfig) => {
    setConfig(cfg);
    setPhase('playing');
  };

  if (phase === 'playing' && config) {
    return (
      <GameScreen
        key={JSON.stringify(config) + Date.now()}
        config={config}
        onNewGame={() => setPhase('setup')}
      />
    );
  }

  return <SetupScreen onStart={handleStart} />;
}

// --- Setup Screen ---

const difficulties: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
];

const colorChoices: { value: ColorChoice; label: string; emoji: string }[] = [
  { value: 'white', label: 'White', emoji: '♔' },
  { value: 'black', label: 'Black', emoji: '♚' },
  { value: 'random', label: 'Random', emoji: '🎲' },
];

function SetupScreen({ onStart }: { onStart: (cfg: ComputerGameConfig) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white');
  const [timeControlId, setTimeControlId] = useState<string>('untimed');

  const handleStart = () => {
    const playerColor: PieceColor =
      colorChoice === 'random'
        ? (Math.random() < 0.5 ? 'white' : 'black')
        : colorChoice;
    onStart({ difficulty, playerColor, timeControlId });
  };

  const categories = [
    { label: '🔫 Bullet', controls: timeControlsByCategory.bullet },
    { label: '⚡ Blitz', controls: timeControlsByCategory.blitz },
    { label: '🕐 Rapid', controls: timeControlsByCategory.rapid },
  ];

  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <h1>🤖 Play vs Computer</h1>

      {/* Difficulty */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ color: '#ccc', marginBottom: '0.75rem' }}>Difficulty</h3>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {difficulties.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              style={{
                ...btnStyle,
                background: difficulty === d.value ? '#7c83ff' : '#292e42',
                color: difficulty === d.value ? '#fff' : '#ccc',
                border: difficulty === d.value ? '1px solid #7c83ff' : '1px solid #444',
                minHeight: 44,
              }}
            >
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ color: '#ccc', marginBottom: '0.75rem' }}>Play as</h3>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {colorChoices.map((c) => (
            <button
              key={c.value}
              onClick={() => setColorChoice(c.value)}
              style={{
                ...btnStyle,
                background: colorChoice === c.value ? '#7c83ff' : '#292e42',
                color: colorChoice === c.value ? '#fff' : '#ccc',
                border: colorChoice === c.value ? '1px solid #7c83ff' : '1px solid #444',
                minHeight: 44,
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time control */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ color: '#ccc', marginBottom: '0.75rem' }}>Time Control</h3>
        <div className="tc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem', maxWidth: 500, marginInline: 'auto' }}>
          <button
            onClick={() => setTimeControlId('untimed')}
            style={{
              ...btnStyle,
              background: timeControlId === 'untimed' ? '#7c83ff' : '#292e42',
              color: timeControlId === 'untimed' ? '#fff' : '#ccc',
              border: timeControlId === 'untimed' ? '1px solid #7c83ff' : '1px solid #444',
              minHeight: 44,
            }}
          >
            ∞ Untimed
          </button>
          {categories.map(({ controls }) =>
            controls.map((tc) => (
              <button
                key={tc.id}
                onClick={() => setTimeControlId(tc.id)}
                style={{
                  ...btnStyle,
                  background: timeControlId === tc.id ? '#7c83ff' : '#292e42',
                  color: timeControlId === tc.id ? '#fff' : '#ccc',
                  border: timeControlId === tc.id ? '1px solid #7c83ff' : '1px solid #444',
                  minHeight: 44,
                }}
              >
                {tc.name}
              </button>
            ))
          )}
        </div>
      </div>

      <button
        onClick={handleStart}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 2.5rem',
          background: '#7c83ff',
          border: 'none',
          color: '#fff',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '1.1rem',
          fontWeight: 600,
          minHeight: 44,
        }}
      >
        Start Game
      </button>

      <div style={{ marginTop: '2rem' }}>
        <Link to="/" style={{ color: '#7aa2f7' }}>← Back to Home</Link>
      </div>
    </div>
  );
}

// --- Game Screen ---

function GameScreen({ config, onNewGame }: { config: ComputerGameConfig; onNewGame: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    gameState,
    playerColor,
    timeWhiteMs,
    timeBlackMs,
    isMyTurn,
    gameOver,
    isLoading,
    error,
    isFallback,
    isThinking,
    isTimed,
    makeMove,
    resign,
  } = useComputerGame(config);

  const difficultyLabel = config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);
  const opponentName = `🤖 Stockfish (${difficultyLabel})`;

  // Show toast when stockfish fails to load
  const toastShownRef = useRef(false);
  useEffect(() => {
    if (error && !toastShownRef.current) {
      toastShownRef.current = true;
      showToast(error, 'error');
    }
  }, [error, showToast]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1>🤖 Play vs Computer</h1>
        <p style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>
        <button onClick={onNewGame} style={{ ...btnStyle, marginTop: '1rem' }}>← Back</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>🤖 Play vs Computer</h1>
        <div style={{ padding: '4rem 0', color: '#888' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          Loading Stockfish engine…
        </div>
      </div>
    );
  }

  return (
    <>
      {isFallback && (
        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          (fallback AI)
        </p>
      )}
      <GamePanel
        gameState={gameState}
        playerColor={playerColor}
        timeWhiteMs={timeWhiteMs}
        timeBlackMs={timeBlackMs}
        playerName={user?.displayName ?? 'You'}
        playerAvatar={user?.avatarUrl ?? null}
        opponentName={opponentName}
        opponentAvatar={null}
        onMove={makeMove}
        onResign={resign}
        isMyTurn={isMyTurn}
        gameOver={gameOver}
        interactive={isMyTurn && !gameOver && !isThinking}
        showClocks={isTimed}
      />
      {isThinking && !gameOver && (
        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
          Computer is thinking…
        </p>
      )}
      {gameOver && (
        <GameOverDialog
          result={gameOver.result}
          reason={gameOver.reason}
          playerColor={playerColor}
          onNewGame={onNewGame}
          onHome={() => navigate('/')}
        />
      )}
    </>
  );
}

// --- Styles ---

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1.5rem',
  background: '#292e42',
  color: '#ccc',
  border: '1px solid #444',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.9rem',
};
