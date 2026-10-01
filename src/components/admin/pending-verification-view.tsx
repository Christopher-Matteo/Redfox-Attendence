'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface PendingItem {
  id: string;
  attendanceId: number;
  employeeId: number;
  employeeName: string;
  branchName: string;
  type: 'check_in' | 'check_out';
  time: string;
  date: string;
  shiftName: string;
  photoUrl: string;
  photoFilename: string;
}

export function PendingVerificationView({
  onVerificationDone,
}: {
  onVerificationDone: () => void;
}) {
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reject confirmation modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetItemToReject, setTargetItemToReject] = useState<PendingItem | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pending-verifications', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setPendingList(data.pending || []);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Error fetching pending verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (item: PendingItem, decision: 'correct' | 'wrong') => {
    try {
      setIsVerifying(true);
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: item.attendanceId,
          type: item.type,
          decision,
        }),
      });

      if (res.ok) {
        // Remove item from pendingList
        setPendingList((prev) => {
          const updated = prev.filter((p) => p.id !== item.id);
          if (currentIndex >= updated.length && updated.length > 0) {
            setCurrentIndex(updated.length - 1);
          }
          return updated;
        });
        onVerificationDone();
      }
    } catch (err) {
      alert('Verification failed. Please retry.');
    } finally {
      setIsVerifying(false);
      setShowRejectModal(false);
      setTargetItemToReject(null);
    }
  };

  const handleWrongClick = (item: PendingItem) => {
    setTargetItemToReject(item);
    setShowRejectModal(true);
  };

  const currentItem = pendingList[currentIndex];

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading pending verifications...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topHeader}>
        <div>
          <div style={styles.badge}>
            <ShieldAlert size={16} color="#dc2626" />
            <span>ID VERIFICATION QUEUE</span>
          </div>
          <h1 style={styles.title}>Attendance Verification</h1>
          <p style={styles.subtitle}>
            Review camera snapshots to verify employees. Temporary photos are automatically destroyed immediately upon decision.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPending}
          style={styles.refreshBtn}
        >
          <RefreshCw size={16} /> Refresh Queue ({pendingList.length})
        </button>
      </div>

      {pendingList.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <Sparkles size={48} color="#16a34a" />
          </div>
          <h2 style={styles.emptyTitle}>All Caught Up!</h2>
          <p style={styles.emptySubtitle}>
            There are currently no pending attendance photos requiring verification. All previous photos have been securely deleted from storage.
          </p>
        </div>
      ) : (
        <div style={styles.queueWrapper}>
          {/* Card Carousel Navigation if multiple */}
          <div style={styles.queueHeader}>
            <span style={styles.queueCounter}>
              Item <strong>{currentIndex + 1}</strong> of <strong>{pendingList.length}</strong>
            </span>
            <div style={styles.queueNav}>
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                style={{ ...styles.navBtn, opacity: currentIndex === 0 ? 0.4 : 1 }}
              >
                ◀ Previous
              </button>
              <button
                type="button"
                disabled={currentIndex >= pendingList.length - 1}
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                style={{ ...styles.navBtn, opacity: currentIndex >= pendingList.length - 1 ? 0.4 : 1 }}
              >
                Next ▶
              </button>
            </div>
          </div>

          {/* Current Verification Card */}
          {currentItem && (
            <div style={styles.verificationCard}>
              {/* Photo Column */}
              <div style={styles.photoColumn}>
                <div style={styles.photoContainer}>
                  <img
                    src={currentItem.photoUrl}
                    alt="Captured attendance face preview"
                    style={styles.photoPreview}
                    onError={(e) => {
                      // If photo was already deleted or error, show clean message
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'photo-deleted-fallback';
                        fallback.innerText = 'Photo Deleted After Verification';
                        fallback.style.cssText =
                          'padding: 3rem 1rem; color: #64748b; font-weight: 600; text-align: center; background: #f1f5f9; border-radius: 14px;';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  <div style={styles.photoPill}>
                    <Clock size={14} />
                    <span>{currentItem.time}</span>
                  </div>
                </div>
                <p style={styles.privacyNotice}>
                  🔒 Private Temporary Photo • Deleted immediately upon decision
                </p>
              </div>

              {/* Details and Action Column */}
              <div style={styles.infoColumn}>
                <div style={styles.metaSection}>
                  <div style={styles.typeBadge(currentItem.type)}>
                    {currentItem.type === 'check_in' ? 'Check In Submission' : 'Check Out Submission'}
                  </div>

                  <h2 style={styles.empTitle}>{currentItem.employeeName}</h2>

                  <div style={styles.metaRow}>
                    <div style={styles.metaItem}>
                      <MapPin size={16} color="#64748b" />
                      <span>{currentItem.branchName}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <Calendar size={16} color="#64748b" />
                      <span>{currentItem.date}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <Clock size={16} color="#64748b" />
                      <span>Shift: {currentItem.shiftName}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.decisionSection}>
                  <h3 style={styles.decisionHeading}>Management Verification Decision:</h3>
                  <p style={styles.decisionDesc}>
                    Does the captured photo match the registered staff member <strong>{currentItem.employeeName}</strong>?
                  </p>

                  <div style={styles.actionButtonGroup}>
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => handleVerify(currentItem, 'correct')}
                      style={styles.correctBtn}
                    >
                      <CheckCircle2 size={24} />
                      <div style={styles.btnTextWrap}>
                        <span style={styles.btnMain}>✓ CORRECT</span>
                        <span style={styles.btnSub}>Marks Present & Destroys Photo</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => handleWrongClick(currentItem)}
                      style={styles.wrongBtn}
                    >
                      <XCircle size={24} />
                      <div style={styles.btnTextWrap}>
                        <span style={styles.btnMain}>✕ WRONG PERSON</span>
                        <span style={styles.btnSub}>Marks Absent & Destroys Photo</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Wrong Person */}
      {showRejectModal && targetItemToReject && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.warnIcon}>
              <AlertTriangle size={36} color="#dc2626" />
            </div>
            <h2 style={styles.modalTitle}>Confirm Wrong Person?</h2>
            <p style={styles.modalDesc}>
              Mark this attendance for <strong>{targetItemToReject.employeeName}</strong> as wrong person and set employee status to <strong>Absent</strong>?
            </p>
            <p style={{ ...styles.modalDesc, fontSize: '0.8rem', color: '#94a3b8' }}>
              The captured temporary photo will be permanently deleted.
            </p>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setTargetItemToReject(null);
                }}
                style={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleVerify(targetItemToReject, 'wrong')}
                style={styles.modalConfirm}
              >
                {isVerifying ? 'Deleting...' : 'Confirm (Mark Absent)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  container: {
    padding: '2rem',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
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
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '4rem 2rem',
    textAlign: 'center',
    maxWidth: '540px',
    margin: '2rem auto',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  emptyIconWrap: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 0.5rem',
  },
  emptySubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: 1.5,
  },
  queueWrapper: {
    maxWidth: '920px',
    margin: '0 auto',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  queueCounter: {
    fontSize: '0.95rem',
    color: '#64748b',
  },
  queueNav: {
    display: 'flex',
    gap: '0.5rem',
  },
  navBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
  },
  verificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 380px) 1fr',
    overflow: 'hidden',
  },
  photoColumn: {
    padding: '1.75rem',
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#000000',
  },
  photoPreview: {
    width: '100%',
    height: '320px',
    objectFit: 'cover',
    display: 'block',
  },
  photoPill: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#ffffff',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  privacyNotice: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.75rem',
    textAlign: 'center',
  },
  infoColumn: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  metaSection: {
    marginBottom: '1.5rem',
  },
  typeBadge: (type: string) => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: type === 'check_in' ? '#ecfdf5' : '#fee2e2',
    color: type === 'check_in' ? '#065f46' : '#991b1b',
    marginBottom: '0.75rem',
  }),
  empTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 1rem',
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    color: '#475569',
  },
  decisionSection: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '1.5rem',
  },
  decisionHeading: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 0.25rem',
  },
  decisionDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '1.25rem',
    lineHeight: 1.4,
  },
  actionButtonGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  correctBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '1rem',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    borderRadius: '14px',
    fontWeight: 700,
    boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
  },
  wrongBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '1rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '14px',
    fontWeight: 700,
    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)',
  },
  btnTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  btnMain: {
    fontSize: '1.05rem',
    fontWeight: 800,
    letterSpacing: '0.02em',
  },
  btnSub: {
    fontSize: '0.7rem',
    fontWeight: 500,
    opacity: 0.9,
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  warnIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
  },
  modalTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 0.5rem',
  },
  modalDesc: {
    fontSize: '0.9rem',
    color: '#475569',
    lineHeight: 1.5,
    margin: '0 0 0.5rem',
  },
  modalActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  modalCancel: {
    padding: '0.85rem',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  modalConfirm: {
    padding: '0.85rem',
    borderRadius: '12px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  centerContainer: {
    padding: '4rem',
    textAlign: 'center',
  },
};
