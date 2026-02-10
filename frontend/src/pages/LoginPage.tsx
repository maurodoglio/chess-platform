import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { devLogin } from '../services/api';

const IS_DEV = import.meta.env.DEV;

const cardStyle: React.CSSProperties = {
  maxWidth: 400,
  width: '100%',
  padding: '2rem',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: '#16213e',
};

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: 12,
  borderRadius: 8,
  fontSize: '1rem',
  fontWeight: 600,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
};

export default function LoginPage() {
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [devLoggingIn, setDevLoggingIn] = useState(false);

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" />;

  const handleDevLogin = async (name: string, id: string) => {
    setDevLoggingIn(true);
    try {
      await devLogin(name, id);
      await refreshUser();
    } catch (e) {
      console.error('Dev login failed:', e);
    } finally {
      setDevLoggingIn(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '0.25rem' }}>♔ ChessPlatform</h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '1.5rem' }}>Play chess online</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href="/api/auth/login/google"
            style={{ ...btnBase, backgroundColor: '#fff', color: '#333' }}
          >
            Sign in with Google
          </a>
          <a
            href="/api/auth/login/github"
            style={{ ...btnBase, backgroundColor: '#24292e', color: '#fff' }}
          >
            Sign in with GitHub
          </a>

          {IS_DEV && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', margin: 0 }}>
                ⚙️ Development only
              </p>
              <button
                onClick={() => handleDevLogin('Dev Player 1', 'dev-user-1')}
                disabled={devLoggingIn}
                style={{ ...btnBase, backgroundColor: '#2d6a4f', color: '#fff' }}
              >
                {devLoggingIn ? 'Logging in...' : 'Dev Login — Player 1'}
              </button>
              <button
                onClick={() => handleDevLogin('Dev Player 2', 'dev-user-2')}
                disabled={devLoggingIn}
                style={{ ...btnBase, backgroundColor: '#1b4332', color: '#fff' }}
              >
                {devLoggingIn ? 'Logging in...' : 'Dev Login — Player 2'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
