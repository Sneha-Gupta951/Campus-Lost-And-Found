import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { uploadImage } from '../api/cloudinary';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

// TODO: replace with real data from GET /admin/categories and /admin/locations
const CATEGORIES = [
  { id: 1, name: 'ID card' }, { id: 2, name: 'Phone' }, { id: 3, name: 'Laptop' },
  { id: 4, name: 'Wallet' }, { id: 5, name: 'Keys' }, { id: 6, name: 'Bag' },
  { id: 7, name: 'Books' }, { id: 8, name: 'Water bottle' }, { id: 9, name: 'Earphones' },
];
const LOCATIONS = [
  { id: 1, name: 'Library' }, { id: 2, name: 'Canteen' }, { id: 3, name: 'Main gate' },
  { id: 4, name: 'Hostel' }, { id: 5, name: 'Classroom block' }, { id: 6, name: 'Sports ground' },
];

export default function PostItem() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState('found');
  const [form, setForm] = useState({
    title: '', category_id: '', location_id: '', description: '',
    hidden_detail: '', date_happened: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]); // [{ id, preview, url, uploading }]

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 4 - images.length;
    const toAdd = files.slice(0, remainingSlots);

    for (const file of toAdd) {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { id, preview, url: null, uploading: true }]);

      try {
        const url = await uploadImage(file);
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, url, uploading: false } : img)));
      } catch (err) {
        alert(err.message);
        setImages((prev) => prev.filter((img) => img.id !== id));
      }
    }
    e.target.value = ''; // allow re-selecting the same file later
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (images.some((img) => img.uploading)) {
      setError('Please wait for image upload to finish');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/items', {
        type,
        title: form.title,
        category_id: Number(form.category_id),
        location_id: Number(form.location_id),
        description: form.description || undefined,
        hidden_detail: type === 'found' ? form.hidden_detail || undefined : undefined,
        date_happened: form.date_happened,
        image_urls: images.map((img) => img.url).filter(Boolean),
      }, token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isFound = type === 'found';

  return (
    <div className="app-shell">
      <TopBar subtitle="POST ITEM" />
      <div className="page-pad">
        {/* Lost / Found toggle */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', padding: 6, borderRadius: 999, marginBottom: 20, border: '1px solid var(--border-soft)' }}>
          <ToggleBtn active={!isFound} onClick={() => setType('lost')} label="● I LOST SOMETHING" color="var(--lost)" />
          <ToggleBtn active={isFound} onClick={() => setType('found')} label="● I FOUND SOMETHING" color="var(--found)" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 19, margin: 0 }}>
            {isFound ? 'Tell us what you found' : 'Tell us what you lost'}
          </h1>
          <span className="badge badge-neutral" style={{ fontSize: 10 }}>{isFound ? 'Found Registry' : 'Lost Registry'}</span>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 20 }}>
          {isFound
            ? "Help return this belonging safely to its MITS owner by logging verifiable details."
            : "We'll notify you automatically if a matching found item is logged."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">
              Photos <span className="field-hint">{images.length} of 4 slots used</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {images.map((img) => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: img.uploading ? 0.4 : 1 }} />
                  {img.uploading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text)' }}>
                      Uploading...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <label style={{
                  aspectRatio: '1', borderRadius: 10, border: '1px dashed var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, gap: 2,
                }}>
                  📷
                  <span style={{ fontSize: 9 }}>Add</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <p className="faint" style={{ fontSize: 10.5, marginTop: 6 }}>
              Clear lighting recommended. Avoid showing serial numbers or personal details in the main photo.
            </p>
          </div>

          <div className="field">
            <label className="field-label">
              Item title <span className="field-hint">Min 5 chars</span>
            </label>
            <input
              className="input"
              placeholder={isFound ? 'e.g. Black Wildcraft backpack with yellow zipper' : 'e.g. Blue Fastrack leather watch'}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              minLength={5}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Category</label>
            <select className="select" value={form.category_id} onChange={(e) => update('category_id', e.target.value)} required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Campus location</label>
            <select className="select" value={form.location_id} onChange={(e) => update('location_id', e.target.value)} required>
              <option value="">Select location</option>
              {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Date {isFound ? 'found' : 'lost'}</label>
            <input
              type="date"
              className="input"
              value={form.date_happened}
              onChange={(e) => update('date_happened', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">
              Public description <span className="field-hint">General info only</span>
            </label>
            <textarea
              className="textarea"
              placeholder="Condition, where exactly it was found/lost, general appearance..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {isFound && (
            <div className="field">
              <label className="field-label">
                🔒 Hidden verification detail <span className="field-hint">Only you and staff see this</span>
              </label>
              <textarea
                className="textarea"
                placeholder="e.g. Has a bus pass inside, small ink stain on front pocket..."
                value={form.hidden_detail}
                onChange={(e) => update('hidden_detail', e.target.value)}
              />
            </div>
          )}

          <div className="note-box" style={{ marginBottom: 20 }}>
            🛡️ <div>
              <strong style={{ color: 'var(--text)' }}>Anti-Fraud Note:</strong> Do NOT put private ownership details
              (padlock codes, serials, lock-screen wallpapers) in the public description. Save those for the hidden
              verification field — only the real owner should be able to describe them.
            </div>
          </div>

          {error && <p style={{ color: 'var(--lost)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Posting...' : `Post ${isFound ? 'Found' : 'Lost'} Item to Campus Feed`}
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}

function ToggleBtn({ active, onClick, label, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 999, border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
        background: active ? color : 'transparent',
        color: active ? '#0b0e17' : 'var(--text-muted)',
      }}
    >
      {label}
    </button>
  );
}
