'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  ShieldAlert,
  Edit2,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { AdminTab } from './sidebar';

interface BranchItem {
  id: number;
  name: string;
  code: string;
}

interface SummaryData {
  totalEmployees: number;
  present: number;
  absent: number;
  weekOff: number;
  leave: number;
  halfDay: number;
  pendingVerificationToday: number;
  totalPendingGlobal: number;
}

interface AttendanceRow {
  attendanceId: number | null;
  employeeId: number;
  employeeName: string;
  branchId: number;
  branchName: string;
  shiftName: string;
  weeklyOff: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInVerification: string | null;
  checkOutVerification: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  status: string;
  manualOverride: boolean;
  updatedByAdmin: boolean;
  updatedAt: string | null;
  date: string;
}

export function DashboardView({
  onNavigateToTab,
  onVerificationUpdate,
}: {
  onNavigateToTab: (tab: AdminTab) => void;
  onVerificationUpdate: () => void;
}) {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit attendance modal state
  const [editingRow, setEditingRow] = useState<AttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Present');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Load branches
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/admin/branches', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) setBranches(data.branches || []);
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    }
    fetchBranches();
  }, []);

  // Load daily attendance and summary
  const loadDailyData = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/attendance/daily?date=${selectedDate}&branchId=${selectedBranch}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setAttendanceList(data.attendance || []);
      }
    } catch (err) {
      console.error('Error loading daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyData();
  }, [selectedDate, selectedBranch]);

  const handleEditClick = (row: AttendanceRow) => {
    setEditingRow(row);
    setEditStatus(row.status === 'Not Marked' ? 'Present' : row.status);
    setEditNotes('');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    try {
      setEditSubmitting(true);
      if (editingRow.attendanceId) {
        // Update existing record
        await fetch(`/api/admin/attendance/${editingRow.attendanceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: editStatus,
            admin_notes: editNotes,
          }),
        });
      } else {
        // Create manual attendance record
        await fetch(`/api/admin/attendance/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: editingRow.employeeId,
            date: selectedDate,
            status: editStatus,
            adminNotes: editNotes,
          }),
        });
      }

      setEditingRow(null);
      await loadDailyData();
      onVerificationUpdate();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setEditSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase().replace(/\s+/g, '-');
    return `status-pill status-${s}`;
  };

  return (
    <div style={styles.container}>
      {/* Top Header & Filters */}
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.pageTitle}>Operational Dashboard</h1>
          <p style={styles.pageSubtitle}>
            Real-time branch attendance overview and verification control.
          </p>
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.filterControl}>
            <Calendar size={16} color="#64748b" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <div style={styles.filterControl}>
            <Filter size={16} color="#64748b" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={styles.branchSelect}
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Total Staff</span>
            <Users size={20} color="#64748b" />
          </div>
          <div style={styles.metricValue}>{summary?.totalEmployees ?? 0}</div>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #10b981' }}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Present</span>
            <UserCheck size={20} color="#10b981" />
          </div>
          <div style={{ ...styles.metricValue, color: '#065f46' }}>
            {summary?.present ?? 0}
          </div>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #ef4444' }}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Absent</span>
            <UserX size={20} color="#ef4444" />
          </div>
          <div style={{ ...styles.metricValue, color: '#991b1b' }}>
            {summary?.absent ?? 0}
          </div>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #6366f1' }}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Week Off</span>
            <Calendar size={20} color="#6366f1" />
          </div>
          <div style={{ ...styles.metricValue, color: '#3730a3' }}>
            {summary?.weekOff ?? 0}
          </div>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #f59e0b' }}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Leave</span>
            <Clock size={20} color="#f59e0b" />
          </div>
          <div style={{ ...styles.metricValue, color: '#92400e' }}>
            {summary?.leave ?? 0}
          </div>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #8b5cf6' }}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Half Day</span>
            <Clock size={20} color="#8b5cf6" />
          </div>
          <div style={{ ...styles.metricValue, color: '#5b21b6' }}>
            {summary?.halfDay ?? 0}
          </div>
        </div>

        {/* Clickable Pending Verification Card */}
        <div
          onClick={() => onNavigateToTab('pending')}
          style={{
            ...styles.metricCard,
            borderLeft: '4px solid #dc2626',
            backgroundColor: summary && summary.totalPendingGlobal > 0 ? '#fef2f2' : '#ffffff',
            cursor: 'pointer',
          }}
          title="Click to verify pending photos"
        >
          <div style={styles.metricHeader}>
            <span style={{ ...styles.metricLabel, color: '#b91c1c', fontWeight: 700 }}>
              Pending Verification
            </span>
            <ShieldAlert size={20} color="#dc2626" />
          </div>
          <div style={{ ...styles.metricValue, color: '#dc2626' }}>
            {summary?.totalPendingGlobal ?? 0}
          </div>
          <span style={styles.clickHint}>Click to review photos ➔</span>
        </div>
      </div>

      {/* Attendance Table Card */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div>
            <h2 style={styles.tableTitle}>Attendance Register ({selectedDate})</h2>
            <p style={styles.tableSubtitle}>
              Showing all staff attendance records and live punch states.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Loading attendance...</p>
          </div>
        ) : attendanceList.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={{ color: '#64748b' }}>No employees registered for this filter.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Shift</th>
                  <th style={styles.th}>Check In</th>
                  <th style={styles.th}>Check Out</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Verification</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((row) => (
                  <tr key={`${row.employeeId}_${row.date}`} style={styles.tableBodyRow}>
                    <td style={styles.td}>
                      <strong style={{ color: '#0f172a' }}>{row.employeeName}</strong>
                      {row.manualOverride && (
                        <span style={styles.adminOverrideTag} title="Modified by Admin">
                          Admin Override
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{row.branchName}</td>
                    <td style={styles.td}>{row.shiftName}</td>
                    <td style={styles.td}>
                      {row.checkInTime ? (
                        <span style={{ fontWeight: 600 }}>{row.checkInTime}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>--</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {row.checkOutTime ? (
                        <span style={{ fontWeight: 600 }}>{row.checkOutTime}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>--</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span className={getStatusBadgeClass(row.status)}>{row.status}</span>
                    </td>
                    <td style={styles.td}>
                      {row.checkInVerification === 'Verified' ? (
                        <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <CheckCircle2 size={16} /> Verified
                        </span>
                      ) : row.checkInVerification === 'Rejected' ? (
                        <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <XCircle size={16} /> Rejected
                        </span>
                      ) : row.checkInVerification === 'Pending' ? (
                        <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <AlertCircle size={16} /> Pending
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>--</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleEditClick(row)}
                        style={styles.editButton}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Status Edit Modal */}
      {editingRow && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>Update Attendance Record</h2>
            <p style={styles.modalSubtitle}>
              Employee: <strong>{editingRow.employeeName}</strong> | Date: <strong>{selectedDate}</strong>
            </p>

            <form onSubmit={handleSaveStatus} style={{ marginTop: '1.25rem' }}>
              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Attendance Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={styles.modalInput}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Week Off">Week Off</option>
                  <option value="Leave">Leave</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <div style={styles.modalGroup}>
                <label style={styles.modalLabel}>Admin Remarks (Optional)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Permission granted / Manual verification"
                  style={styles.modalInput}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  style={styles.confirmBtn}
                >
                  {editSubmitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '2rem',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  filterGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  filterControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ffffff',
    padding: '0.5rem 0.85rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  dateInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#0f172a',
    backgroundColor: 'transparent',
  },
  branchSelect: {
    border: 'none',
    outline: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#0f172a',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: '1.85rem',
    fontWeight: 800,
    color: '#0f172a',
    marginTop: '0.5rem',
  },
  clickHint: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#dc2626',
    marginTop: '0.25rem',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #f1f5f9',
  },
  tableTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  tableSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.2rem',
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
  tableHeadRow: {
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
  tableBodyRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.9rem',
    color: '#334155',
  },
  adminOverrideTag: {
    display: 'inline-block',
    marginLeft: '6px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#d97706',
    backgroundColor: '#fef3c7',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  editButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  loadingContainer: {
    padding: '4rem',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: '3rem',
    textAlign: 'center',
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
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '1.75rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  modalGroup: {
    marginBottom: '1rem',
  },
  modalLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.35rem',
  },
  modalInput: {
    width: '100%',
    padding: '0.75rem 0.9rem',
    fontSize: '0.95rem',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    outline: 'none',
  },
  modalActions: {
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
  confirmBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
};
