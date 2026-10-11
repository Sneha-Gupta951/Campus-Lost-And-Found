import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'mitsgwl.ac.in';

export default function Login() {
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_blue',
      size: 'large',
      shape: 'pill',
      width: 320,
    });
  }, []);

  async function handleGoogleResponse(response) {
    try {
      const data = await api.post('/auth/google', { id_token: response.credential });
      login(data);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
      <div className="page-pad" style={{ maxWidth: 480, width: '100%', paddingTop: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'var(--surface-raised)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24, marginBottom: 10,
          }}>
            🛡️
          </div>
          <span className="badge badge-success">● SECURE</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <span className="badge badge-neutral">🏛️ MITS ACADEMIC NETWORK SSO</span>
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 28, lineHeight: 1.25, margin: '0 0 12px' }}>
          Lost something on campus? <span style={{ color: 'var(--accent)' }}>Let's find it.</span>
        </h1>
        <p className="muted" style={{ textAlign: 'center', fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
          Report lost items, discover found belongings, and safely reconnect them with their owners across all MITS campus blocks.
        </p>

        <div className="card page-pad" style={{ marginBottom: 20 }}>
          <div className="note-box" style={{ marginBottom: 18 }}>
            🔒 Restricted to verified <strong style={{ color: 'var(--text)' }}>@{DOMAIN}</strong> institutional IDs
          </div>
          <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
        </div>

        <p className="faint" style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Institutional Safety Framework
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FeatureRow icon="🔒" title="End-to-End Ownership Verification" text="Item challenge questions guarantee zero false claim transfers." />
          <FeatureRow icon="🛡️" title="Safe Custody Desk Handshakes" text="Campus security and department desks log every handoff." />
          <FeatureRow icon="🏛️" title="Official MITS Campus Protocol" text="Synced with campus administration and library lockers." />
        </div>

        <p className="faint" style={{ textAlign: 'center', fontSize: 11, marginTop: 28 }}>
          Madanapalle Institute of Technology &amp; Science<br />Automated Campus Recovery Infrastructure
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, text }) {
  return (
    <div className="card page-pad" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}
