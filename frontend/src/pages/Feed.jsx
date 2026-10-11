import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

export default function Feed() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (query) params.set('q', query);
      const data = await api.get(`/items?${params.toString()}`, token);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const lostCount = items.filter((i) => i.type === 'lost').length;
  const foundCount = items.filter((i) => i.type === 'found').length;

  return (
    <div className="app-shell">
      <TopBar subtitle="HOME FEED" />
      <div className="page-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Good morning,<br />{firstName}</h1>
          <span style={{ fontSize: 22 }}>👋</span>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>
          Find what you're looking for across MITS campus
        </p>

        <form onSubmit={(e) => { e.preventDefault(); loadItems(); }} style={{ marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Search lost or found items (e.g. keys, ID card)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
          <TabButton active={type === ''} onClick={() => setType('')} label={`All (${items.length})`} />
          <TabButton active={type === 'lost'} onClick={() => setType('lost')} label={`Lost (${lostCount})`} />
          <TabButton active={type === 'found'} onClick={() => setType('found')} label={`Found (${foundCount})`} />
        </div>

        <p className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Campus Activity Feed
        </p>

        {loading && <p className="muted">Loading...</p>}
        {error && <p style={{ color: 'var(--lost)' }}>{error}</p>}
        {!loading && items.length === 0 && (
          <div className="card page-pad" style={{ textAlign: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>No items yet — be the first to report one.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="badge"
      style={{
        border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12.5, padding: '8px 16px',
        background: active ? 'var(--accent)' : 'var(--surface-raised)',
        color: active ? 'var(--accent-text)' : 'var(--text-muted)',
      }}
    >
      {label}
    </button>
  );
}

function ItemCard({ item }) {
  const isFound = item.type === 'found';
  return (
    <Link to={`/items/${item.id}`} className="card page-pad" style={{ display: 'flex', gap: 12 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 12, background: 'var(--surface-raised)',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        📦
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className={`badge ${isFound ? 'badge-found' : 'badge-lost'}`}>
            {isFound ? 'FOUND' : 'LOST'}
          </span>
          <span className="faint" style={{ fontSize: 11 }}>
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          📍 {item.location_name}
        </div>
      </div>
    </Link>
  );
}
