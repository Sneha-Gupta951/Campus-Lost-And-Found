import { useAuth } from '../context/AuthContext';

export default function TopBar({ subtitle }) {
  const { user } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div>
          <div className="topbar-title">MITS Lost &amp; Found</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="topbar-icons">
        <span style={{ fontSize: 18, cursor: 'pointer' }}>🔔</span>
        <div className="avatar">{initial}</div>
      </div>
    </div>
  );
}
