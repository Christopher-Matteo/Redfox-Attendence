'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  QrCode,
  Edit2,
  Download,
  Printer,
  RefreshCw,
  ExternalLink,
  X,
  AlertTriangle,
} from 'lucide-react';

interface BranchRecord {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  active_employees_count: number;
  total_employees_count: number;
  qr_token: string;
}

interface QrModalData {
  id: number;
  name: string;
  code: string;
  attendanceUrl: string;
  attendanceFullUrl: string;
  qrDataUrl: string;
}

export function BranchesView() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // QR Modal State
  const [qrModalData, setQrModalData] = useState<QrModalData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (res.ok) setBranches(data.branches || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setName('');
    setCode('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: BranchRecord) => {
    setModalMode('edit');
    setEditingId(branch.id);
    setName(branch.name);
    setCode(branch.code);
    setStatus(branch.status);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (branch: BranchRecord) => {
    const actionWord = branch.status === 'active' ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionWord} ${branch.name}?`)) return;

    try {
      const newStatus = branch.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branch.name,
          code: branch.code,
          status: newStatus,
        }),
      });

      if (res.ok) {
        loadBranches();
      } else {
        alert('Failed to update branch status');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleViewQr = async (branchId: number) => {
    try {
      setQrLoading(true);
      const res = await fetch(`/api/admin/branches/${branchId}/qr`);
      const data = await res.json();
      if (res.ok && data.branch) {
        setQrModalData(data.branch);
      } else {
        alert('Failed to load QR code');
      }
    } catch {
      alert('Network error loading QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleRegenerateQr = async () => {
    if (!qrModalData) return;
    if (!confirm('Regenerating will invalidate old paper QR codes. Are you sure?')) return;

    try {
      setQrLoading(true);
      const res = await fetch(`/api/admin/branches/${qrModalData.id}/regenerate-qr`, { method: 'POST' });
      if (res.ok) {
        handleViewQr(qrModalData.id);
      }
    } catch {
      alert('Failed to regenerate QR');
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrModalData) return;
    const a = document.createElement('a');
    a.href = qrModalData.qrDataUrl;
    a.download = `redfox_qr_${qrModalData.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintQr = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      alert('Branch name and code are required');
      return;
    }

    try {
      setFormSubmitting(true);
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, code }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to create branch');
          return;
        }
      } else if (modalMode === 'edit' && editingId) {
        const res = await fetch(`/api/admin/branches/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, code, status }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to update branch');
          return;
        }
      }

      setIsModalOpen(false);
      loadBranches();
    } catch {
      alert('Network error');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topHeader} className="no-print">
        <div>
          <h1 style={styles.title}>Hotel Branch Management</h1>
          <p style={styles.subtitle}>
            Manage hotel properties, configure unique branch codes, and generate permanent attendance QR placards.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={styles.addBtn}
        >
          <Plus size={18} /> + Add Branch
        </button>
      </div>

      {/* Branches Table */}
      <div style={styles.card} className="no-print">
        {loading ? (
          <div style={styles.centerContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Loading hotel branches...</p>
          </div>
        ) : branches.length === 0 ? (
          <div style={styles.centerContainer}>
            <p style={{ color: '#64748b' }}>No branches found. Click &quot;+ Add Branch&quot; to create one.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Branch Name</th>
                  <th style={styles.th}>Branch Code</th>
                  <th style={styles.th}>Permanent URL</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Active Staff</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong style={{ color: '#0f172a' }}>{b.name}</strong>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.codeTag}>{b.code}</code>
                    </td>
                    <td style={styles.td}>
                      <a
                        href={`/attendance/${b.code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.urlLink}
                      >
                        /attendance/{b.code} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.staffCountBadge}>{b.active_employees_count} staff</span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: b.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                          color: b.status === 'active' ? '#065f46' : '#64748b',
                        }}
                      >
                        {b.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionRow}>
                        <button
                          type="button"
                          onClick={() => handleViewQr(b.id)}
                          style={styles.qrBtn}
                          title="View QR Code"
                        >
                          <QrCode size={15} /> QR Code
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(b)}
                          style={styles.editBtn}
                          title="Edit Branch"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(b)}
                          style={{
                            ...styles.toggleBtn,
                            color: b.status === 'active' ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {b.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === 'add' ? 'Add New Branch' : 'Edit Branch Details'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Redfox Signature ECR"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Branch Code (URL Slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ecr or city-center"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  style={styles.input}
                />
                <span style={styles.helperText}>
                  Attendance URL: <code>/attendance/{code || 'code'}</code>
                </span>
              </div>

              {modalMode === 'edit' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={styles.input}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={styles.submitBtn}
                >
                  {formSubmitting
                    ? 'Saving...'
                    : modalMode === 'add'
                    ? 'Create Branch'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View QR Code Modal & Printable Placard */}
      {qrModalData && (
        <div style={styles.modalBackdrop}>
          <div style={styles.qrCard} id="printable-qr-placard">
            <div style={styles.qrPlacard}>
              <div style={styles.hotelBranding}>
                <span style={{ fontSize: '1.75rem' }}>🦊</span>
                <span style={styles.hotelBrandText}>REDFOX & REDSTONE HOTELS</span>
              </div>

              <h2 style={styles.qrBranchTitle}>{qrModalData.name}</h2>
              <p style={styles.qrSubtitle}>Official Staff Attendance Portal</p>

              {/* QR Image */}
              <div style={styles.qrImageWrap}>
                <img
                  src={qrModalData.qrDataUrl}
                  alt={`Attendance QR for ${qrModalData.name}`}
                  style={styles.qrImg}
                />
              </div>

              <div style={styles.qrUrlBox}>
                <span style={styles.qrScanText}>Scan with phone camera or visit:</span>
                <strong style={styles.qrUrlText}>{qrModalData.attendanceUrl}</strong>
              </div>

              <p style={styles.qrFooterText}>
                No app install required. Front camera verification enabled.
              </p>
            </div>

            {/* QR Modal Actions */}
            <div style={styles.qrActions} className="no-print">
              <button
                type="button"
                onClick={handleDownloadQr}
                style={styles.downloadQrBtn}
              >
                <Download size={16} /> Download QR PNG
              </button>
              <button
                type="button"
                onClick={handlePrintQr}
                style={styles.printQrBtn}
              >
                <Printer size={16} /> Print QR Placard
              </button>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                style={styles.closeQrBtn}
              >
                Close
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
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: 700,
    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  tableResponsive: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '0.85rem 1.25rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.9rem',
    color: '#334155',
  },
  codeTag: {
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#0f172a',
  },
  urlLink: {
    color: '#dc2626',
    textDecoration: 'none',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  staffCountBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  qrBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  editBtn: {
    padding: '6px 10px',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    borderRadius: '8px',
    fontSize: '0.8rem',
  },
  toggleBtn: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  centerContainer: {
    padding: '4rem',
    textAlign: 'center',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  closeBtn: {
    padding: '6px',
    color: '#64748b',
    borderRadius: '8px',
  },
  modalBody: {
    padding: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.35rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 0.9rem',
    fontSize: '0.95rem',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    outline: 'none',
  },
  helperText: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  cancelBtn: {
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  submitBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  qrCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  qrPlacard: {
    padding: '2.5rem 2rem 2rem',
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  hotelBranding: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '1rem',
  },
  hotelBrandText: {
    fontSize: '0.8rem',
    fontWeight: 800,
    color: '#dc2626',
    letterSpacing: '0.08em',
  },
  qrBranchTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  qrSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.2rem',
  },
  qrImageWrap: {
    padding: '1rem',
    backgroundColor: '#ffffff',
    border: '2px solid #0f172a',
    borderRadius: '20px',
    display: 'inline-block',
    margin: '1.5rem auto 1rem',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
  },
  qrImg: {
    width: '240px',
    height: '240px',
    display: 'block',
  },
  qrUrlBox: {
    marginTop: '0.5rem',
  },
  qrScanText: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#64748b',
  },
  qrUrlText: {
    fontSize: '1.1rem',
    color: '#0f172a',
    letterSpacing: '0.02em',
  },
  qrFooterText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '1rem',
  },
  qrActions: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 1.5rem 1.5rem',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  downloadQrBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '0.75rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  printQrBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '0.75rem',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  closeQrBtn: {
    padding: '0.75rem 1rem',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
};
