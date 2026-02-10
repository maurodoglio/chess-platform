import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ModeCard from '../components/ModeCard';

const badgeStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  backgroundColor: 'rgba(255,255,255,0.08)',
  fontSize: '0.8rem',
  color: '#ccc',
};

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      <h1 style={{ fontSize: '1.8rem' }}>Welcome, {user?.displayName}!</h1>

      <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', width: '100%', maxWidth: 960, padding: '0 1rem' }}>
        <ModeCard icon="⚔️" title="Play Online" subtitle="Match with players at your skill level" onClick={() => navigate('/play/online')}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={badgeStyle}>Bullet {user?.ratingBullet}</span>
            <span style={badgeStyle}>Blitz {user?.ratingBlitz}</span>
            <span style={badgeStyle}>Rapid {user?.ratingRapid}</span>
          </div>
        </ModeCard>

        <ModeCard icon="🤖" title="Play vs Computer" subtitle="Challenge Stockfish AI" onClick={() => navigate('/play/computer')} />

        <ModeCard icon="🤝" title="Pass & Play" subtitle="Two players, one device" onClick={() => navigate('/play/local')} />
      </div>

      <Link to="/history" style={{ color: '#999', fontSize: '0.9rem', textDecoration: 'none' }}>
        Game History →
      </Link>
    </div>
  );
}
