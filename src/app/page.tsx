import Link from 'next/link';
import { getDb } from '@/lib/db';
import { QrCode, MapPin, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const db = getDb();
  const branches = db.prepare("SELECT * FROM branches WHERE status = 'active' ORDER BY name ASC").all() as any[];

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>
          <span>🦊</span>
          <span style={styles.badgeText}>REDFOX & REDSTONE HOTELS</span>
        </div>

        <h1 style={styles.title}>REDFOX ATTENDANCE</h1>
        <p style={styles.subtitle}>
          Employee Digital Attendance Terminal. Please scan the QR code posted at your hotel branch, or tap your assigned branch below.
        </p>

        <div style={styles.qrIconWrap}>
          <QrCode size={56} color="#dc2626" />
        </div>

        <div style={styles.branchList}>
          <h2 style={styles.branchListTitle}>Active Hotel Branches</h2>
          <div style={styles.branchGrid}>
            {branches.map((b) => (
              <Link
                key={b.id}
                href={`/attendance/${b.code}`}
                style={styles.branchCard}
              >
                <div style={styles.branchIcon}>
                  <MapPin size={20} color="#dc2626" />
                </div>
                <div style={styles.branchInfo}>
                  <strong style={styles.branchName}>{b.name}</strong>
                  <span style={styles.branchCode}>/attendance/{b.code}</span>
                </div>
                <ArrowRight size={18} color="#94a3b8" />
              </Link>
            ))}
          </div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            💡 <strong>Staff Instructions:</strong> Select your name and complete the front-facing camera verification to log your shift Check In / Check Out.
          </p>
        </div>
      </div>

      <footer style={styles.footer}>
        <p>© 2026 Redfox & Redstone Hotels. Official Attendance System.</p>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2.5rem 2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
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
    fontSize: '2rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginTop: '0.75rem',
    lineHeight: 1.5,
  },
  qrIconWrap: {
    width: '90px',
    height: '90px',
    margin: '1.5rem auto',
    backgroundColor: '#fef2f2',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #fecaca',
  },
  branchList: {
    marginTop: '1.5rem',
    textAlign: 'left',
  },
  branchListTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
  },
  branchGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  branchCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.9rem 1rem',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  branchIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    flexShrink: 0,
  },
  branchInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  branchName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  branchCode: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  infoBox: {
    marginTop: '1.5rem',
    padding: '0.85rem 1rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '12px',
    textAlign: 'left',
  },
  infoText: {
    fontSize: '0.8rem',
    color: '#92400e',
    margin: 0,
    lineHeight: 1.4,
  },
  footer: {
    padding: '1.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.4)',
  },
};
