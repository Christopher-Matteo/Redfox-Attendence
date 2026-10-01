'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed. Please check credentials.');
        return;
      }

      // Successfully authenticated
      router.push('/private-admin');
      router.refresh();
    } catch {
      setErrorMsg('Network error. Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>
          <ShieldCheck size={16} color="#991b1b" />
          <span style={styles.badgeText}>HOTEL MANAGEMENT SYSTEM</span>
        </div>

        <h1 style={styles.title}>Private Admin Access</h1>
        <p style={styles.subtitle}>
          Authorized personnel only. Please sign in to verify attendance and manage branches.
        </p>

        {errorMsg && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} color="#b91c1c" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', color: '#991b1b' }}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <div style={styles.inputWrapper}>
              <User size={18} color="#64748b" style={styles.inputIcon} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin username"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                required
                style={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Panel'}
          </button>
        </form>

        <div style={styles.credentialsHint}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Default Credentials:</span>
          <br />
          User: <code>admin</code> | Password: <code>RedfoxAdmin2026!</code>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2.5rem 2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: '#fee2e2',
    borderRadius: '9999px',
    marginBottom: '1rem',
  },
  badgeText: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#991b1b',
    letterSpacing: '0.05em',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginTop: '0.5rem',
    lineHeight: 1.4,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '1.25rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    textAlign: 'left',
  },
  form: {
    marginTop: '1.5rem',
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: '1.2rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.4rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem 0.85rem 2.5rem',
    fontSize: '0.95rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    outline: 'none',
  },
  submitButton: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.95rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
  },
  credentialsHint: {
    marginTop: '1.5rem',
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    fontSize: '0.75rem',
    color: '#64748b',
    border: '1px dashed #cbd5e1',
  },
};
