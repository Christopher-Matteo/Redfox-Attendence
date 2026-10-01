'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';

export function SettingsView({ adminName }: { adminName: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Failed to change password' });
        return;
      }

      setMsg({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMsg({ type: 'error', text: 'Network error updating password' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.title}>System Settings & Security</h1>
          <p style={styles.subtitle}>
            Manage administrator credentials, session safeguards, and data privacy rules.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Change Password Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <KeyRound size={22} color="#dc2626" />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Change Admin Password</h2>
              <p style={styles.cardSubtitle}>Update your management portal security key.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} style={styles.formBody}>
            {msg && (
              <div
                style={{
                  ...styles.alertBox,
                  backgroundColor: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  borderColor: msg.type === 'success' ? '#a7f3d0' : '#fecaca',
                  color: msg.type === 'success' ? '#065f46' : '#991b1b',
                }}
              >
                {msg.type === 'success' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={styles.saveBtn}
            >
              <Lock size={18} />
              {submitting ? 'Updating Key...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Security Overview Card */}
        <div style={styles.sideCard}>
          <div style={styles.sideHeader}>
            <ShieldCheck size={28} color="#16a34a" />
            <div>
              <h3 style={styles.sideTitle}>Active Security Profile</h3>
              <p style={styles.sideSubtitle}>Administrator: {adminName}</p>
            </div>
          </div>

          <div style={styles.securityInfo}>
            <div style={styles.secItem}>
              <strong>Private Access URL:</strong>
              <span>Hidden route <code>/private-admin</code> with zero employee links</span>
            </div>
            <div style={styles.secItem}>
              <strong>Session Token:</strong>
              <span>Cryptographically signed HMAC HTTP-only cookie</span>
            </div>
            <div style={styles.secItem}>
              <strong>Photo Privacy Guarantee:</strong>
              <span>Temporary camera photos are permanently deleted from server disk upon Correct / Wrong verification</span>
            </div>
            <div style={styles.secItem}>
              <strong>Password Encryption:</strong>
              <span>Node.js scrypt + 16-byte random salt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    padding: '2rem',
  },
  topHeader: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(340px, 520px) 1fr',
    gap: '2rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  iconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: '2px 0 0',
  },
  formBody: {
    padding: '1.75rem',
  },
  alertBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '1.25rem',
  },
  formGroup: {
    marginBottom: '1.2rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem',
    fontSize: '0.95rem',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    outline: 'none',
  },
  saveBtn: {
    width: '100%',
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '0.95rem',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 700,
  },
  sideCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2rem',
    border: '1px solid #e2e8f0',
    alignSelf: 'start',
  },
  sideHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f1f5f9',
  },
  sideTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sideSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
  },
  securityInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  secItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '0.85rem',
    color: '#475569',
  },
};
