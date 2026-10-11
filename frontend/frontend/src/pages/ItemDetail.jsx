import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

export default function ItemDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [proofAnswer, setProofAnswer] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/items/${id}`, token)
      .then((data) => setItem(data.item))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function submitClaim(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/items/${id}/claims`, { proof_answer: proofAnswer, contact_info: contactInfo || undefined }, token);
      alert('Claim submitted. The finder or security desk will review it.');
      setShowClaimForm(false);
      navigate('/claims');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenterMsg text="Loading..." />;
  if (error) return <CenterMsg text={error} isError />;
  if (!item) return null;

  const isFound = item.type === 'found';

  return (
    <div className="app-shell">
      <TopBar subtitle="MITS Campus Verification" />
      <div className="page-pad">
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: 16, cursor: 'pointer', fontSize: 14 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <span className={`badge ${isFound ? 'badge-found' : 'badge-lost'}`}>{item.type.toUpperCase()} ITEM</span>
          {item.current_holder && <span className="badge badge-neutral">🛡️ Secured at {item.location_name}</span>}
        </div>

        <h1 style={{ fontSize: 22, lineHeight: 1.3, margin: '0 0 4px' }}>{item.title}</h1>
        <p className="faint" style={{ fontSize: 12, margin: '0 0 16px' }}>ID: #{item.id.slice(0, 8).toUpperCase()}</p>

        <div style={{
          height: 200, borderRadius: 16, background: 'var(--surface-raised)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, marginBottom: 20,
        }}>
          {item.images?.length ? (
            <img src={item.images[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
          ) : '📦'}
        </div>

        <div className="card page-pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Verified Chain of Custody</span>
            <span className="badge badge-success">● IN CUSTODY</span>
          </div>

          <DetailRow icon="🏷️" label="Category" value={item.category_name} />
          <DetailRow icon="📍" label={isFound ? 'Location Found' : 'Location Lost'} value={item.location_name} />
          <DetailRow icon="📅" label="Date" value={new Date(item.date_happened).toLocaleDateString()} />
          {item.description && <DetailRow icon="📝" label="Description" value={item.description} />}
        </div>

        <div className="note-box" style={{ marginBottom: 20 }}>
          🛡️ <div>
            <strong style={{ color: 'var(--text)' }}>Anti-Fraud Safeguard:</strong> Sensitive identifying details are
            intentionally withheld from this public record to prevent opportunistic claims.
          </div>
        </div>

        {!showClaimForm ? (
          <button className="btn btn-primary" onClick={() => setShowClaimForm(true)}>
            ✓ Claim This Item (Submit Proof)
          </button>
        ) : (
          <form onSubmit={submitClaim} className="card page-pad">
            <div className="field">
              <label className="field-label">
                Prove it's yours
                <span className="field-hint">Describe a hidden detail</span>
              </label>
              <textarea
                className="textarea"
                placeholder="e.g. There's a bus pass inside, and a small ink stain on the front pocket..."
                value={proofAnswer}
                onChange={(e) => setProofAnswer(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="field">
              <label className="field-label">
                Your contact / meeting preference <span className="field-hint">Shown to the finder</span>
              </label>
              <textarea
                className="textarea"
                placeholder="e.g. Roll no. 23CS104, Hostel Block B, available after 5pm — or a phone number"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </form>
        )}

        <div className="note-box" style={{ marginTop: 16 }}>
          💡 <div>
            <strong style={{ color: 'var(--text)' }}>Campus Safety Tip:</strong> Always meet at the Central Helpdesk
            for verified handovers — campus security supervises every exchange.
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div>
        <div className="faint" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5 }}>{value}</div>
      </div>
    </div>
  );
}

function CenterMsg({ text, isError }) {
  return (
    <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: isError ? 'var(--lost)' : 'var(--text-muted)' }}>{text}</p>
    </div>
  );
}
