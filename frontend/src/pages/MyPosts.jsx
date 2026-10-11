import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

const STATUS_STYLE = {
  open: { label: 'Open', className: 'badge-found' },
  claimed: { label: 'Claimed', className: 'badge-neutral' },
  returned: { label: 'Returned', className: 'badge-success' },
  closed: { label: 'Closed', className: 'badge-neutral' },
  expired: { label: 'Expired', className: 'badge-lost' },
};

export default function MyPosts() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadItems() {
    setLoading(true);
    try {
      const data = await api.get('/items/mine', token);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.delete(`/items/${id}`, token);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  const openCount = items.filter((i) => i.status === 'open').length;
  const returnedCount = items.filter((i) => i.status === 'returned').length;

  return (
    <div className="app-shell">
      <TopBar subtitle="MY POSTS" />
      <div className="page-pad">
        <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>My Posts</h1>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 18 }}>
          Everything you've reported as lost or found
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          <StatBox label="Total" value={items.length} />
          <StatBox label="Open" value={openCount} />
          <StatBox label="Returned" value={returnedCount} />
        </div>

        {loading && <p className="muted">Loading...</p>}
        {error && <p style={{ color: 'var(--lost)' }}>{error}</p>}
        {!loading && items.length === 0 && (
          <div className="card page-pad" style={{ textAlign: 'center', marginBottom: 16 }}>
            <p className="muted" style={{ margin: '0 0 12px' }}>You haven't posted anything yet.</p>
            <Link to="/post" className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', padding: '10px 24px' }}>
              + Report an item
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <PostCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="card page-pad" style={{ padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div className="faint" style={{ fontSize: 10, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function PostCard({ item, onDelete }) {
  const isFound = item.type === 'found';
  const status = STATUS_STYLE[item.status] || STATUS_STYLE.open;

  return (
    <div className="card page-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={`badge ${isFound ? 'badge-found' : 'badge-lost'}`}>{item.type.toUpperCase()}</span>
          <span className={`badge ${status.className}`}>{status.label}</span>
        </div>
        <span className="faint" style={{ fontSize: 11 }}>{new Date(item.created_at).toLocaleDateString()}</span>
      </div>

      <Link to={`/items/${item.id}`} style={{ display: 'block', marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</div>
      </Link>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        {item.category_name} • 📍 {item.location_name}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`/items/${item.id}`} className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: 12.5 }}>
          View
        </Link>
        <button
          onClick={() => onDelete(item.id)}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '8px 12px', fontSize: 12.5, color: 'var(--lost)' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
