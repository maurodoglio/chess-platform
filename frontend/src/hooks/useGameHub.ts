import { useState, useEffect } from 'react';
import { gameHub } from '../services/signalr';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export function useGameHub() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const handleStatus = (status: string) => {
      setConnectionStatus(status as ConnectionStatus);
    };

    gameHub.on('_connectionStatus', handleStatus);

    if (gameHub.isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
      gameHub.connect().catch(() => setConnectionStatus('disconnected'));
    }

    return () => {
      gameHub.off('_connectionStatus', handleStatus);
      // Don't disconnect the singleton — it persists across page navigations.
      // It will be cleaned up when the browser tab closes.
    };
  }, []);

  return { gameHub, connectionStatus };
}
