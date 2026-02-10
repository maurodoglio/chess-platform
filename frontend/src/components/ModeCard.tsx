import { useState, type ReactNode } from 'react';

interface ModeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  children?: ReactNode;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#16213e',
  border: '1px solid #2a2a4a',
  borderRadius: 12,
  padding: '1.5rem',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s, filter 0.2s',
  width: '100%',
};

const cardHoverStyle: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  filter: 'brightness(1.1)',
};

export default function ModeCard({ icon, title, subtitle, onClick, children }: ModeCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="mode-card"
      style={{ ...cardStyle, ...(hovered ? cardHoverStyle : {}) }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>{icon}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '0.9rem', color: '#999', textAlign: 'center' }}>{subtitle}</div>
      {children && <div style={{ marginTop: '1rem' }}>{children}</div>}
    </div>
  );
}
