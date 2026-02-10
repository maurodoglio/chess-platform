import { useNavigate } from 'react-router-dom';
import type { PieceColor } from '../types/chess';

interface GameOverDialogProps {
  result: 'white' | 'black' | 'draw';
  reason: string;
  playerColor: PieceColor;
  onNewGame?: () => void;
  onHome?: () => void;
}

const reasonLabels: Record<string, string> = {
  checkmate: 'by checkmate',
  stalemate: 'by stalemate',
  resignation: 'by resignation',
  timeout: 'on time',
  draw_agreement: 'by agreement',
  threefold_repetition: 'by threefold repetition',
  fifty_move_rule: 'by fifty-move rule',
  insufficient_material: 'by insufficient material',
};

export default function GameOverDialog({ result, reason, playerColor, onNewGame, onHome }: GameOverDialogProps) {
  const navigate = useNavigate();

  let title: string;
  let titleColor: string;

  if (result === 'draw') {
    title = 'Draw';
    titleColor = '#888';
  } else if (result === playerColor) {
    title = 'You Won!';
    titleColor = '#22c55e';
  } else {
    title = 'You Lost';
    titleColor = '#ef4444';
  }

  const reasonText = reasonLabels[reason] ?? reason;

  const handleNewGame = onNewGame ?? (() => navigate('/play/online'));
  const handleHome = onHome ?? (() => navigate('/'));

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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={handleNewGame}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#7c83ff',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            New Game
          </button>
          <button
            onClick={handleHome}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'transparent',
              border: '1px solid #555',
              color: '#ccc',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
