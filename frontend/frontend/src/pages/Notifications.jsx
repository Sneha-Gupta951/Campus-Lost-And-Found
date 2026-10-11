import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

const ICONS = {
  match_found: '🔍',
  claim_received: '📥',
  claim_approved: '✅',
  claim_rejected: '❌',
};

export default function Notifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const data = await api.get('/notifications', token);
      setNotifications(data.notifications);
    } finally {
      setLoading(false);
    }
  }

  async function handleClick(n) {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/read`, {}, token);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch (err) {
        // non-critical — ignore
      }
    }
    if (n.item_id) navigate(`/items/${n.item_id}`);
  }

  async function handleMarkAllRead() {
    try {
      await api.patch('/notifications/read-all', {}, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      alert(err.message);
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="app-shell">
      <TopBar subtitle="NOTIFICATIONS" />
      <div className="page-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12.5, cursor: 'pointer' }}
            >
              Mark all read
            </button>
          )}
        </div>

        {loading && <p className="muted">Loading...</p>}
        {!loading && notifications.length === 0 && (
          <div className="card page-pad" style={{ textAlign: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>No notifications yet.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className="card page-pad"
              style={{
                display: 'flex', gap: 12, textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%',
                background: n.is_read ? 'var(--surface)' : 'var(--accent-soft)',
              }}
            >
              <span style={{ fontSize: 20 }}>{ICONS[n.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{n.message}</div>
                <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
