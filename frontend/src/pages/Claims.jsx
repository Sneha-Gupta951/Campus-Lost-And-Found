import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

export default function Claims() {
  const { token } = useAuth();
  const [tab, setTab] = useState('received'); // 'received' | 'mine'
  const [received, setReceived] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/claims/received', token),
      api.get('/claims/mine', token),
    ])
      .then(([r, m]) => {
        setReceived(r.claims);
        setMine(m.claims);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleReview(claimId, status, reviewNote) {
    try {
      await api.patch(`/claims/${claimId}`, { status, review_note: reviewNote || undefined }, token);
      setReceived((prev) => prev.map((c) => (c.id === claimId ? { ...c, status, review_note: reviewNote } : c)));
    } catch (err) {
      alert(err.message);
    }
  }

  const pendingReceived = received.filter((c) => c.status === 'pending');
  const approvedCount = received.filter((c) => c.status === 'approved').length + mine.filter((c) => c.status === 'approved').length;
  const pendingMineCount = mine.filter((c) => c.status === 'pending').length;

  return (
    <div className="app-shell">
      <TopBar subtitle="POST ITEM" />
      <div className="page-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Claims Center</h1>
          <span className="badge badge-neutral">🛡️ ID Secured</span>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 18 }}>
          Ownership verification and handovers for campus assets
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <TabBtn active={tab === 'received'} onClick={() => setTab('received')} label={`Review Claims`} count={pendingReceived.length} />
          <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')} label={`My Claims`} count={mine.length} />
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          <StatBox color="var(--success)" label="Approved" value={approvedCount} sub="Ready pickup" />
          <StatBox color="#f5b73f" label="In review" value={pendingReceived.length} sub="Desk check" />
          <StatBox color="var(--accent)" label="Action" value={pendingMineCount} sub="Awaiting you" />
        </div>

        {loading && <p className="muted">Loading...</p>}

        {tab === 'received' && (
          <>
            {!loading && received.length === 0 && <EmptyCard text="No claims have come in on your posts yet." />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {received.map((claim) => (
                <ReceivedClaimCard key={claim.id} claim={claim} onReview={handleReview} />
              ))}
            </div>
          </>
        )}

        {tab === 'mine' && (
          <>
            {!loading && mine.length === 0 && <EmptyCard text="You haven't claimed anything yet." />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mine.map((claim) => (
                <MyClaimCard key={claim.id} claim={claim} />
              ))}
            </div>
          </>
        )}

        <div className="note-box" style={{ marginTop: 20 }}>
          🛡️ <div>
            <strong style={{ color: 'var(--text)' }}>Verified handovers only:</strong> Always exchange items at an
            official campus security desk, never in private.
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function TabBtn({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)',
        background: active ? 'var(--accent-soft)' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'var(--accent)' : 'var(--surface-raised)',
          color: active ? 'var(--accent-text)' : 'var(--text-muted)',
          borderRadius: 999, fontSize: 10, padding: '1px 6px',
        }}>{count}</span>
      )}
    </button>
  );
}

function StatBox({ color, label, value, sub }) {
  return (
    <div className="card page-pad" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
        <span className="faint" style={{ fontSize: 9.5, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div className="faint" style={{ fontSize: 10 }}>{sub}</div>
    </div>
  );
}

function EmptyCard({ text }) {
  return (
    <div className="card page-pad" style={{ textAlign: 'center' }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{text}</p>
    </div>
  );
}

function ReceivedClaimCard({ claim, onReview }) {
  const isPending = claim.status === 'pending';
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [handoverLocation, setHandoverLocation] = useState('');

  function confirmApprove() {
    if (!handoverLocation.trim()) {
      alert('Please tell the owner where to collect their item');
      return;
    }
    onReview(claim.id, 'approved', handoverLocation);
  }

  return (
    <div className="card page-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="badge badge-found">Found by you</span>
        <span className="faint" style={{ fontSize: 11 }}>{new Date(claim.created_at).toLocaleDateString()}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{claim.item_title}</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>📍 {claim.location_name}</div>

      <div className="note-box" style={{ flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <div className="faint" style={{ fontSize: 10, textTransform: 'uppercase' }}>Claimant's proof</div>
        <div style={{ color: 'var(--text)', fontSize: 13 }}>{claim.proof_answer}</div>
        <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>— {claim.claimant_name} ({claim.claimant_email})</div>
      </div>

      {claim.contact_info && (
        <div className="note-box" style={{ flexDirection: 'column', gap: 6, marginBottom: 12, borderColor: 'var(--accent)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--accent)' }}>📍 Contact / meeting preference</div>
          <div style={{ color: 'var(--text)', fontSize: 13 }}>{claim.contact_info}</div>
        </div>
      )}

      {isPending && !showApproveForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowApproveForm(true)}>
            ✓ Approve Claim
          </button>
          <button className="btn btn-secondary" onClick={() => onReview(claim.id, 'rejected')}>
            ✕ Reject Claim
          </button>
        </div>
      )}

      {isPending && showApproveForm && (
        <div>
          <div className="field">
            <label className="field-label">
              Where can they collect it? <span className="field-hint">Shown to the owner</span>
            </label>
            <textarea
              className="textarea"
              placeholder="e.g. Central Library help desk, ask for Sneha — available 10am-4pm"
              value={handoverLocation}
              onChange={(e) => setHandoverLocation(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={confirmApprove}>
              ✓ Confirm Approval
            </button>
            <button className="btn btn-secondary" onClick={() => setShowApproveForm(false)} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 18px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isPending && (
        <span className={`badge ${claim.status === 'approved' ? 'badge-success' : 'badge-lost'}`}>
          {claim.status === 'approved' ? '● Approved' : '● Rejected'}
        </span>
      )}
    </div>
  );
}

function MyClaimCard({ claim }) {
  const statusBadge = {
    pending: <span className="badge badge-neutral">● Under review</span>,
    approved: <span className="badge badge-success">● Approved — arrange pickup</span>,
    rejected: <span className="badge badge-lost">● Rejected</span>,
    withdrawn: <span className="badge badge-neutral">● Withdrawn</span>,
  }[claim.status];

  return (
    <div className="card page-pad">
      <div style={{ marginBottom: 8 }}>{statusBadge}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{claim.item_title}</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        📍 {claim.location_name} • Posted by {claim.owner_name}
      </div>
      {claim.status === 'approved' && (
        <div className="note-box" style={{ flexDirection: 'column', gap: 6, borderColor: 'var(--success)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--success)' }}>📍 Collect your item here</div>
          <div style={{ color: 'var(--text)', fontSize: 13 }}>
            {claim.review_note || 'The finder approved your claim — message them or check the campus security desk for handover details.'}
          </div>
        </div>
      )}
      {claim.status === 'rejected' && claim.review_note && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>"{claim.review_note}"</p>
      )}
    </div>
  );
}
