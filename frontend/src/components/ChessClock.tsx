import { useState, useEffect, useRef, useCallback } from 'react';

interface ChessClockProps {
  timeMs: number;
  isActive: boolean;
  isPlayerClock: boolean;
}

function formatTime(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (clamped >= 60000) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  if (clamped >= 10000) {
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
  const tenths = Math.floor((clamped % 1000) / 100);
  return `0:${seconds}.${tenths}`;
}

export default function ChessClock({ timeMs, isActive, isPlayerClock }: ChessClockProps) {
  const lastSyncTime = useRef(timeMs);
  const lastSyncTimestamp = useRef(Date.now());
  const rafId = useRef<number>(0);
  const [displayMs, setDisplayMs] = useState(timeMs);

  // Reset sync point when server time changes
  useEffect(() => {
    lastSyncTime.current = timeMs;
    lastSyncTimestamp.current = Date.now();
    setDisplayMs(timeMs);
  }, [timeMs]);

  const tick = useCallback(() => {
    const elapsed = Date.now() - lastSyncTimestamp.current;
    const current = Math.max(0, lastSyncTime.current - elapsed);
    setDisplayMs(current);
    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (isActive) {
      rafId.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId.current);
    }
  }, [isActive, tick]);

  const isLow = displayMs < 10000;

  return (
    <div
      className="chess-clock"
      style={{
        fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", monospace',
        fontSize: '1.6rem',
        fontWeight: 700,
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        minWidth: '5.5rem',
        textAlign: 'center',
        color: isActive ? '#fff' : '#888',
        background: isActive ? 'rgba(124, 131, 255, 0.15)' : 'transparent',
        ...(isLow && isActive
          ? { color: '#ef4444', animation: 'clockPulse 1s ease-in-out infinite' }
          : {}),
        ...(isPlayerClock ? { border: '1px solid rgba(124, 131, 255, 0.3)' } : {}),
      }}
    >
      {formatTime(displayMs)}
      {isLow && isActive && (
        <style>{`
          @keyframes clockPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      )}
    </div>
  );
}
