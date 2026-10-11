import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function TopBar({ subtitle }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const initial = user?.name?.[0]?.toUpperCase() || '?';

  useEffect(() => {
    if (!token) return;
    api.get('/notifications', token)
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => {}); // non-critical, fail silently
  }, [token]);

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
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
          <span style={{ fontSize: 18 }}>🔔</span>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -6, background: 'var(--lost)', color: '#fff',
              fontSize: 9, fontWeight: 700, borderRadius: 999, minWidth: 15, height: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>{initial}</div>
      </div>
    </div>
  );
}
