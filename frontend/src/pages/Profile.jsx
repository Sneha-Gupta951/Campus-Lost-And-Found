import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initial = user.name?.[0]?.toUpperCase() || '?';
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <TopBar subtitle="POST ITEM" />
      <div className="page-pad">
        {/* Identity card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 84, height: 84, borderRadius: '50%', background: 'var(--surface-raised)',
            border: '2px solid var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'var(--accent)', marginBottom: 12,
          }}>
            {initial}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
          <span className="badge badge-success" style={{ marginTop: 6 }}>● Google Verified</span>
        </div>

        {/* Verified credentials — REAL data only */}
        <p className="faint" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Campus Digital Credentials
        </p>
        <div className="card page-pad" style={{ marginBottom: 20 }}>
          <CredRow icon="🏛️" label="MITS Google Workspace SSO" value={user.email} status="Connected" />
          <hr className="divider" />
          <CredRow icon="🛡️" label="Account role" value={roleLabel(user.role)} />
          {memberSince && (
            <>
              <hr className="divider" />
              <CredRow icon="📅" label="Member since" value={memberSince} />
            </>
          )}
        </div>

        {/* Support & policy */}
        <p className="faint" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Campus Support &amp; Policy
        </p>
        <div className="card page-pad" style={{ marginBottom: 20 }}>
          <PolicyRow icon="📋" label="Lost & Found Guidelines" hint="45-day retention period" />
          <hr className="divider" />
          <PolicyRow icon="🛡️" label="Security Desk Directory" hint="24/7 across campus gates" />
          <hr className="divider" />
          <PolicyRow icon="⚠️" label="Report Suspicious Activity" hint="Confidential line to admin" danger />
        </div>

        <button className="btn btn-secondary" onClick={handleLogout}>
          ↪ Sign Out
        </button>

        <p className="faint" style={{ textAlign: 'center', fontSize: 10.5, marginTop: 24 }}>
          Madanapalle Institute of Technology &amp; Science<br />Campus Lost &amp; Found System
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

function roleLabel(role) {
  return { user: 'Student', security: 'Security Desk', admin: 'Administrator' }[role] || role;
}

function CredRow({ icon, label, value, status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div className="muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
      {status && <span className="badge badge-success" style={{ fontSize: 9.5 }}>{status}</span>}
    </div>
  );
}

function PolicyRow({ icon, label, hint, danger }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: danger ? 'var(--lost)' : 'var(--text)' }}>{label}</div>
        <div className="faint" style={{ fontSize: 11 }}>{hint}</div>
      </div>
      <span className="faint">›</span>
    </div>
  );
}
