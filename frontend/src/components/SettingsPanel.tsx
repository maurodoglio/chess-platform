import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { boardThemes } from '../data/themes';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function SettingsPanel({ open, onClose, soundOn, onToggleSound }: SettingsPanelProps) {
  const { currentTheme, setTheme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
    }}>
      <div
        ref={panelRef}
        className="settings-panel-inner"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          background: '#1a1a2e',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
          padding: '1.5rem',
          overflowY: 'auto',
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#e0e0e0', fontSize: '1.2rem' }}>⚙️ Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Board Theme */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#aaa', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Board Theme</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {boardThemes.map(theme => {
              const isActive = theme.id === currentTheme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    background: isActive ? 'rgba(124,131,255,0.15)' : 'transparent',
                    border: isActive ? '2px solid #7c83ff' : '2px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Color swatches */}
                  <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: 20, height: 20, backgroundColor: theme.lightSquare }} />
                    <div style={{ width: 20, height: 20, backgroundColor: theme.darkSquare }} />
                  </div>
                  <span style={{ color: '#e0e0e0', fontSize: '0.9rem', flex: 1, textAlign: 'left' }}>
                    {theme.name}
                  </span>
                  {isActive && <span style={{ color: '#7c83ff', fontSize: '1.1rem' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound toggle */}
        <div>
          <h3 style={{ color: '#aaa', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Sound</h3>
          <button
            onClick={onToggleSound}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              background: 'transparent',
              border: '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{soundOn ? '🔊' : '🔇'}</span>
            <span style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
              Sound {soundOn ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
