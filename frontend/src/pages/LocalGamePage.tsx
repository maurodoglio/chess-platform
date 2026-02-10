import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocalGame, type LocalGameConfig } from '../hooks/useLocalGame';
import { timeControlsByCategory } from '../data/timeControls';
import GamePanel from '../components/GamePanel';

type Phase = 'setup' | 'playing';

export default function LocalGamePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<LocalGameConfig | null>(null);

  const handleStart = (cfg: LocalGameConfig) => {
    setConfig(cfg);
    setPhase('playing');
  };

  if (phase === 'playing' && config) {
    return (
      <GameScreen
        key={JSON.stringify(config) + Date.now()}
        config={config}
        onPlayAgain={() => {
          // Restart with same settings — force remount via key change
          setConfig({ ...config });
          setPhase('playing');
        }}
        onNewGame={() => setPhase('setup')}
      />
    );
  }

  return <SetupScreen onStart={handleStart} />;
}

// --- Setup Screen ---

function SetupScreen({ onStart }: { onStart: (cfg: LocalGameConfig) => void }) {
  const [whiteName, setWhiteName] = useState('White');
  const [blackName, setBlackName] = useState('Black');
  const [timeControlId, setTimeControlId] = useState<string>('untimed');

  const handleStart = () => {
    onStart({
      timeControlId,
      whiteName: whiteName.trim() || 'White',
      blackName: blackName.trim() || 'Black',
    });
  };

  const categories = [
    { label: '🔫 Bullet', controls: timeControlsByCategory.bullet },
    { label: '⚡ Blitz', controls: timeControlsByCategory.blitz },
    { label: '🕐 Rapid', controls: timeControlsByCategory.rapid },
  ];

  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <h1>🤝 Pass &amp; Play</h1>
      <p style={{ color: '#999', fontSize: '1.1rem', marginTop: '0.25rem' }}>
        Two players, one device
      </p>

      {/* Player names */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ color: '#ccc', display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
            White's name
          </label>
          <input
            value={whiteName}
            onChange={e => setWhiteName(e.target.value)}
            maxLength={20}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: '#ccc', display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
            Black's name
          </label>
          <input
            value={blackName}
            onChange={e => setBlackName(e.target.value)}
            maxLength={20}
            style={inputStyle}
          />
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

interface GameScreenProps {
  config: LocalGameConfig;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

function GameScreen({ config, onPlayAgain, onNewGame }: GameScreenProps) {
  const navigate = useNavigate();
  const { whiteName, blackName } = config;

  const {
    gameState,
    timeWhiteMs,
    timeBlackMs,
    gameOver,
    isTimed,
    handleMove,
    resign,
    declareDraw,
  } = useLocalGame(config);

  const [confirmResignWhite, setConfirmResignWhite] = useState(false);
  const [confirmResignBlack, setConfirmResignBlack] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);

  const turnText = gameState.isCheck
    ? `${gameState.turn === 'white' ? whiteName : blackName} is in check`
    : `${gameState.turn === 'white' ? whiteName : blackName} to move`;

  const handleResignWhite = () => {
    if (!confirmResignWhite) { setConfirmResignWhite(true); setConfirmResignBlack(false); setConfirmDraw(false); return; }
    resign('white');
    setConfirmResignWhite(false);
  };

  const handleResignBlack = () => {
    if (!confirmResignBlack) { setConfirmResignBlack(true); setConfirmResignWhite(false); setConfirmDraw(false); return; }
    resign('black');
    setConfirmResignBlack(false);
  };

  const handleDeclareDraw = () => {
    if (!confirmDraw) { setConfirmDraw(true); setConfirmResignWhite(false); setConfirmResignBlack(false); return; }
    declareDraw();
    setConfirmDraw(false);
  };

  const cancelConfirm = () => {
    setConfirmResignWhite(false);
    setConfirmResignBlack(false);
    setConfirmDraw(false);
  };

  // Wrap handleMove to satisfy GamePanel's onResign (unused — we have custom buttons)
  const noopResign = () => {};

  // Build the game-over dialog title
  let gameOverTitle: string | undefined;
  if (gameOver) {
    if (gameOver.result === 'draw') {
      gameOverTitle = 'Draw';
    } else {
      gameOverTitle = `${gameOver.result === 'white' ? whiteName : blackName} wins!`;
    }
  }

  return (
    <>
      {/* Turn indicator */}
      {!gameOver && (
        <p style={{ textAlign: 'center', color: '#ccc', fontSize: '1rem', margin: '0.75rem 0 0' }}>
          {turnText}
        </p>
      )}

      <GamePanel
        gameState={gameState}
        playerColor="white"
        timeWhiteMs={timeWhiteMs}
        timeBlackMs={timeBlackMs}
        playerName={whiteName}
        playerAvatar={null}
        opponentName={blackName}
        opponentAvatar={null}
        onMove={handleMove}
        onResign={noopResign}
        isMyTurn={true}
        gameOver={gameOver}
        interactive={!gameOver}
        showClocks={isTimed}
      />

      {/* Action buttons */}
      {!gameOver && (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <button
            onClick={handleResignWhite}
            style={{
              ...btnStyle,
              borderColor: confirmResignWhite ? '#ef4444' : '#555',
              color: confirmResignWhite ? '#ef4444' : '#ccc',
            }}
          >
            {confirmResignWhite ? 'Confirm?' : `Resign ${whiteName}`}
          </button>
          <button
            onClick={handleResignBlack}
            style={{
              ...btnStyle,
              borderColor: confirmResignBlack ? '#ef4444' : '#555',
              color: confirmResignBlack ? '#ef4444' : '#ccc',
            }}
          >
            {confirmResignBlack ? 'Confirm?' : `Resign ${blackName}`}
          </button>
          <button
            onClick={handleDeclareDraw}
            style={{
              ...btnStyle,
              borderColor: confirmDraw ? '#f59e0b' : '#555',
              color: confirmDraw ? '#f59e0b' : '#ccc',
            }}
          >
            {confirmDraw ? 'Confirm Draw?' : 'Declare Draw'}
          </button>
          {(confirmResignWhite || confirmResignBlack || confirmDraw) && (
            <button onClick={cancelConfirm} style={btnStyle}>Cancel</button>
          )}
        </div>
      )}

      {/* Game over dialog */}
      {gameOver && (
        <LocalGameOverDialog
          title={gameOverTitle!}
          reason={gameOver.reason}
          onPlayAgain={onPlayAgain}
          onNewGame={onNewGame}
          onHome={() => navigate('/')}
        />
      )}
    </>
  );
}

// --- Local game over dialog (no ratings, custom title, Play Again + New Game + Home) ---

function LocalGameOverDialog({
  title,
  reason,
  onPlayAgain,
  onNewGame,
  onHome,
}: {
  title: string;
  reason: string;
  onPlayAgain: () => void;
  onNewGame: () => void;
  onHome: () => void;
}) {
  const reasonLabels: Record<string, string> = {
    checkmate: 'by checkmate',
    stalemate: 'by stalemate',
    resignation: 'by resignation',
    timeout: 'on time',
    draw_agreement: 'by agreement',
    threefold_repetition: 'by threefold repetition',
    fifty_move_rule: 'by fifty-move rule',
    insufficient_material: 'by insufficient material',
    draw: 'by draw',
  };

  const reasonText = reasonLabels[reason] ?? reason;
  const titleColor = title === 'Draw' ? '#888' : '#22c55e';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '2rem 2.5rem',
        textAlign: 'center',
        minWidth: '300px',
        border: '1px solid #333',
      }}>
        <h2 style={{ fontSize: '2rem', color: titleColor, margin: '0 0 0.5rem' }}>
          {title}
        </h2>
        <p style={{ color: '#b0b0b0', fontSize: '1.1rem', margin: '0 0 2rem' }}>
          {reasonText}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onPlayAgain} style={primaryBtnStyle}>
            Play Again
          </button>
          <button onClick={onNewGame} style={secondaryBtnStyle}>
            New Game
          </button>
          <button onClick={onHome} style={secondaryBtnStyle}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Styles ---

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1.5rem',
  background: 'transparent',
  color: '#ccc',
  border: '1px solid #555',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.9rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  background: '#1a1b26',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 6,
  fontSize: '1rem',
  width: '160px',
  outline: 'none',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.6rem 1.5rem',
  background: '#7c83ff',
  border: 'none',
  color: '#fff',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '0.6rem 1.5rem',
  background: 'transparent',
  border: '1px solid #555',
  color: '#ccc',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
};
