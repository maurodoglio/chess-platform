import { useState, useMemo } from 'react';
import ChessBoard from './ChessBoard';
import ChessClock from './ChessClock';
import CapturedPieces from './CapturedPieces';
import MoveList from './MoveList';
import useBoardSize from '../hooks/useBoardSize';
import useBreakpoint from '../hooks/useBreakpoint';
import type { GameState, PieceColor } from '../types/chess';

export interface GamePanelProps {
  gameState: GameState;
  playerColor: PieceColor;
  timeWhiteMs: number;
  timeBlackMs: number;
  playerName: string;
  playerAvatar: string | null;
  opponentName: string;
  opponentAvatar: string | null;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  onResign: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  onDeclineDraw?: () => void;
  isMyTurn: boolean;
  drawOfferedByOpponent?: boolean;
  gameOver: any | null;
  interactive?: boolean;
  showClocks?: boolean;
  premove?: { from: string; to: string } | null;
  onPremove?: (from: string, to: string, promotion?: string) => void;
  onClearPremove?: () => void;
}

export default function GamePanel({
  gameState,
  playerColor,
  timeWhiteMs,
  timeBlackMs,
  playerName,
  playerAvatar,
  opponentName,
  opponentAvatar,
  onMove,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  isMyTurn,
  drawOfferedByOpponent = false,
  gameOver,
  interactive,
  showClocks = true,
  premove,
  onPremove,
  onClearPremove,
}: GamePanelProps) {
  const [confirmResign, setConfirmResign] = useState(false);
  const [drawPending, setDrawPending] = useState(false);
  const [movesExpanded, setMovesExpanded] = useState(false);
  const boardSize = useBoardSize();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isDesktop = bp === 'desktop';

  const isWhiteTurn = gameState.turn === 'white';
  const opponentColor: PieceColor = playerColor === 'white' ? 'black' : 'white';
  const opponentTime = playerColor === 'white' ? timeBlackMs : timeWhiteMs;
  const playerTime = playerColor === 'white' ? timeWhiteMs : timeBlackMs;
  const opponentClockActive = !gameOver && (
    (opponentColor === 'white' && isWhiteTurn) || (opponentColor === 'black' && !isWhiteTurn)
  );
  const playerClockActive = !gameOver && (
    (playerColor === 'white' && isWhiteTurn) || (playerColor === 'black' && !isWhiteTurn)
  );

  const boardInteractive = interactive !== undefined ? interactive : (isMyTurn && !gameOver);

  const flashColor = useMemo(() => {
    if (!gameOver) return null;
    if (gameOver.result === 'draw') return 'rgba(128,128,128,0.4)';
    if (gameOver.result === playerColor) return 'rgba(34,197,94,0.4)';
    return 'rgba(239,68,68,0.4)';
  }, [gameOver, playerColor]);

  const handleResign = () => {
    if (!confirmResign) {
      setConfirmResign(true);
      return;
    }
    onResign();
    setConfirmResign(false);
  };

  const handleOfferDraw = () => {
    onOfferDraw?.();
    setDrawPending(true);
  };

  const buttonBase: React.CSSProperties = {
    padding: '0.5rem 1.2rem',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    background: 'transparent',
    color: '#ccc',
    minHeight: 44,
  };

  const avatarStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    objectFit: 'cover',
  };

  const playerInfoRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: boardSize,
    width: '100%',
    padding: '0.4rem 0',
    flexWrap: 'wrap',
  };

  const nameSection: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
    minWidth: 0,
  };

  const boardColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Top: opponent info */}
      <div style={playerInfoRow} className="player-info-row">
        <div style={nameSection}>
          {opponentAvatar ? (
            <img src={opponentAvatar} alt="" style={avatarStyle} />
          ) : (
            <div style={{ ...avatarStyle, background: '#2a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#888' }}>
              {opponentName[0]?.toUpperCase()}
            </div>
          )}
          <span style={{ color: '#7c83ff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {opponentName}
          </span>
          <CapturedPieces fen={gameState.fen} color={opponentColor} />
        </div>
        {showClocks && <ChessClock timeMs={opponentTime} isActive={opponentClockActive} isPlayerClock={false} />}
      </div>

      {/* Board */}
      <div className="board-container" style={{ position: 'relative' }}>
        <ChessBoard
          gameState={gameState}
          playerColor={playerColor}
          onMove={onMove}
          interactive={boardInteractive}
          boardWidth={boardSize}
          premove={premove}
          onPremove={onPremove}
          onClearPremove={onClearPremove}
        />
        {flashColor && (
          <div
            key={`flash-${gameOver?.result}-${gameOver?.reason}`}
            className="game-over-flash"
            style={{ background: flashColor }}
          />
        )}
      </div>

      {/* Bottom: player info */}
      <div style={playerInfoRow} className="player-info-row">
        <div style={nameSection}>
          {playerAvatar ? (
            <img src={playerAvatar} alt="" style={avatarStyle} />
          ) : (
            <div style={{ ...avatarStyle, background: '#2a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#888' }}>
              {playerName[0]?.toUpperCase()}
            </div>
          )}
          <span style={{ color: '#e0e0e0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playerName}
          </span>
          <CapturedPieces fen={gameState.fen} color={playerColor} />
        </div>
        {showClocks && <ChessClock timeMs={playerTime} isActive={playerClockActive} isPlayerClock={true} />}
      </div>
    </div>
  );

  const sidePanel = (
    <div className="game-panel-side" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: isDesktop ? 300 : '100%', maxWidth: isDesktop ? 300 : boardSize }}>
      {/* Move list */}
      {isMobile ? (
        <div style={{ width: '100%' }}>
          <button
            onClick={() => setMovesExpanded(!movesExpanded)}
            style={{
              ...buttonBase,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: movesExpanded ? '0.5rem' : 0,
            }}
          >
            <span>Moves ({gameState.moveHistory.length})</span>
            <span>{movesExpanded ? '▲' : '▼'}</span>
          </button>
          {movesExpanded && <MoveList moves={gameState.moveHistory} />}
        </div>
      ) : (
        <MoveList moves={gameState.moveHistory} />
      )}

      {/* Draw offer banner */}
      {drawOfferedByOpponent && !gameOver && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#2a2a4a',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#e0e0e0' }}>Opponent offers a draw</span>
          <button onClick={onAcceptDraw} style={{ ...buttonBase, borderColor: '#22c55e', color: '#22c55e' }}>
            <span className="action-btn-icon">✓</span>
            <span className="action-btn-text">Accept</span>
          </button>
          <button onClick={onDeclineDraw} style={{ ...buttonBase, borderColor: '#ef4444', color: '#ef4444' }}>
            <span className="action-btn-icon">✕</span>
            <span className="action-btn-text">Decline</span>
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!gameOver && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <button
            onClick={handleResign}
            style={{ ...buttonBase, borderColor: confirmResign ? '#ef4444' : '#555', color: confirmResign ? '#ef4444' : '#ccc' }}
          >
            <span className="action-btn-icon">{confirmResign ? '⚠' : '🏳'}</span>
            <span className="action-btn-text">{confirmResign ? 'Confirm Resign?' : 'Resign'}</span>
          </button>
          {confirmResign && (
            <button onClick={() => setConfirmResign(false)} style={buttonBase}>
              <span className="action-btn-icon">✕</span>
              <span className="action-btn-text">Cancel</span>
            </button>
          )}
          {onOfferDraw && (
            <button
              onClick={handleOfferDraw}
              disabled={drawPending || drawOfferedByOpponent}
              style={{
                ...buttonBase,
                opacity: drawPending || drawOfferedByOpponent ? 0.5 : 1,
                cursor: drawPending || drawOfferedByOpponent ? 'not-allowed' : 'pointer',
              }}
            >
              <span className="action-btn-icon">½</span>
              <span className="action-btn-text">Offer Draw</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="game-panel-outer"
      style={{
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        alignItems: isDesktop ? 'flex-start' : 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: isMobile ? '0.5rem' : '1rem',
      }}
    >
      {boardColumn}
      {sidePanel}
    </div>
  );
}
