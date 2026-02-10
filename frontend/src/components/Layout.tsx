import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/sounds';
import SettingsPanel from './SettingsPanel';

export default function Layout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [soundOn, setSoundOn] = useState(soundService.isEnabled);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleSound = () => {
    soundService.toggle();
    setSoundOn(soundService.isEnabled);
  };

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileMenuOpen]);

  return (
    <div>
      <nav style={{ backgroundColor: '#0f0f23', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          ♔ ChessPlatform
        </div>

        {/* Desktop nav items */}
        <div className="nav-desktop-items" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '4px 6px', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '4px 6px', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ⚙️
          </button>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#999' }}>?</div>
          )}
          <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>{user?.displayName}</span>
          <button
            onClick={logout}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: '#e0e0e0', cursor: 'pointer', fontSize: '0.85rem', minHeight: 44 }}
          >
            Logout
          </button>
        </div>

        {/* Mobile nav: avatar with dropdown */}
        <div
          className="nav-mobile-avatar"
          ref={menuRef}
          style={{ display: 'none', position: 'relative', alignItems: 'center' }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#999' }}>?</div>
            )}
          </button>
          {mobileMenuOpen && (
            <div className="mobile-dropdown">
              <button onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }}>
                ⚙️ Settings
              </button>
              <button onClick={() => { toggleSound(); setMobileMenuOpen(false); }}>
                {soundOn ? '🔊' : '🔇'} Sound {soundOn ? 'On' : 'Off'}
              </button>
              <button onClick={() => { navigate('/history'); setMobileMenuOpen(false); }}>
                📜 History
              </button>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
        {children ?? <Outlet />}
      </main>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
    </div>
  );
}
