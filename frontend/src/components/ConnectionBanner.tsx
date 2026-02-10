import { useState, useEffect } from 'react';

export type BannerStatus = 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionBannerProps {
  status: BannerStatus;
  onReconnect?: () => void;
}

export default function ConnectionBanner({ status, onReconnect }: ConnectionBannerProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (status !== 'reconnecting') return;
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'connected') return null;

  const isReconnecting = status === 'reconnecting';

  return (
    <div style={{
      background: isReconnecting ? '#92400e' : '#991b1b',
      color: '#fff',
      textAlign: 'center',
      padding: '6px 12px',
      fontSize: '0.85rem',
      fontWeight: 500,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    }}>
      {isReconnecting ? (
        <span>Reconnecting{dots}</span>
      ) : (
        <>
          <span>Connection lost</span>
          {onReconnect && (
            <button
              onClick={onReconnect}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff',
                borderRadius: 4,
                padding: '2px 10px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Reconnect
            </button>
          )}
        </>
      )}
    </div>
  );
}
