'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  UserX,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface BranchItem {
  id: number;
  name: string;
}

interface EmployeeItem {
  id: number;
  full_name: string;
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

export function DailyAttendanceView() {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Mark absent confirmation modal
  const [showMarkAbsentModal, setShowMarkAbsentModal] = useState(false);
  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false);

  // Edit attendance modal
  const [editingRow, setEditingRow] = useState<AttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Present');
  const [editCheckIn, setEditCheckIn] = useState<string>('');
  const [editCheckOut, setEditCheckOut] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    // Fetch branches and employees for filter dropdowns
    async function loadFilters() {
      try {
        const [bRes, eRes] = await Promise.all([
          fetch('/api/admin/branches'),
          fetch('/api/admin/employees'),
        ]);
        const bData = await bRes.json();
        const eData = await eRes.json();
        if (bRes.ok) setBranches(bData.branches || []);
        if (eRes.ok) setEmployees(eData.employees || []);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    }
    loadFilters();
  }, []);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/attendance/daily?date=${selectedDate}&branchId=${selectedBranch}&employeeId=${selectedEmployee}&status=${selectedStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setAttendanceList(data.attendance || []);
      }
    } catch (err) {
      console.error('Error loading daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate, selectedBranch, selectedEmployee, selectedStatus]);

  const handleMarkUnmarkedAbsent = async () => {
    try {
      setIsMarkingAbsent(true);
      const res = await fetch('/api/admin/attendance/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranch,
          date: selectedDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowMarkAbsentModal(false);
        loadAttendance();
      } else {
        alert(data.error || 'Failed to mark absent');
      }
    } catch {
      alert('Network error while marking absent');
    } finally {
      setIsMarkingAbsent(false);
    }
  };

  const handleOpenEdit = (row: AttendanceRow) => {
    setEditingRow(row);
    setEditStatus(row.status === 'Not Marked' ? 'Present' : row.status);
    setEditCheckIn(row.checkInTime || '');
    setEditCheckOut(row.checkOutTime || '');
    setEditNotes('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    try {
      setEditSubmitting(true);
      if (editingRow.attendanceId) {
        await fetch(`/api/admin/attendance/${editingRow.attendanceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: editStatus,
            check_in_time: editCheckIn || null,
            check_out_time: editCheckOut || null,
            admin_notes: editNotes,
          }),
        });
      } else {
        await fetch(`/api/admin/attendance/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: editingRow.employeeId,
            date: selectedDate,
            status: editStatus,
            checkInTime: editCheckIn || null,
            checkOutTime: editCheckOut || null,
            adminNotes: editNotes,
          }),
        });
      }

      setEditingRow(null);
      loadAttendance();
    } catch {
      alert('Failed to update record');
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
      {/* Page Header */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.title}>Daily Attendance Management</h1>
          <p style={styles.subtitle}>
            Inspect staff punches, apply manual overrides, and manage daily absent flags.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => setShowMarkAbsentModal(true)}
            style={styles.markAbsentBtn}
          >
            <UserX size={16} /> Mark Unmarked Employees Absent
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>Date</label>
          <div style={styles.inputWrap}>
            <Calendar size={16} color="#64748b" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.filterInput}
            />
          </div>
        </div>

        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>Branch</label>
          <div style={styles.inputWrap}>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={styles.filterSelect}
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

        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>Employee</label>
          <div style={styles.inputWrap}>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>Status</label>
          <div style={styles.inputWrap}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Week Off">Week Off</option>
              <option value="Leave">Leave</option>
              <option value="Half Day">Half Day</option>
              <option value="Not Marked">Not Marked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.centerContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Refreshing attendance logs...</p>
          </div>
        ) : attendanceList.length === 0 ? (
          <div style={styles.centerContainer}>
            <p style={{ color: '#64748b' }}>No matching records found for the selected criteria.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Employee Name</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Shift</th>
                  <th style={styles.th}>Check In</th>
                  <th style={styles.th}>Check Out</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Verification</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((row) => (
                  <tr key={`${row.employeeId}_${row.date}`} style={styles.tr}>
                    <td style={styles.td}>
                      <strong style={{ color: '#0f172a' }}>{row.employeeName}</strong>
                      {row.manualOverride && (
                        <div style={styles.adminAuditTag}>
                          Updated by Admin {row.updatedAt ? `(${new Date(row.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                        </div>
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
                        onClick={() => handleOpenEdit(row)}
                        style={styles.actionBtn}
                      >
                        <Edit2 size={14} /> Edit Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Unmarked Absent Modal */}
      {showMarkAbsentModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalWarnIcon}>
              <AlertTriangle size={36} color="#dc2626" />
            </div>
            <h2 style={styles.modalTitle}>Mark Unmarked Employees Absent?</h2>
            <p style={styles.modalDesc}>
              This will automatically mark all employees for date <strong>{selectedDate}</strong> (Branch: {selectedBranch === 'all' ? 'All Branches' : selectedBranch}) who have no attendance punch or status as <strong>Absent</strong>.
            </p>
            <p style={{ ...styles.modalDesc, fontSize: '0.8rem', color: '#94a3b8' }}>
              Employees assigned to normal Weekly Off on this day will be kept as Week Off.
            </p>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowMarkAbsentModal(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMarkingAbsent}
                onClick={handleMarkUnmarkedAbsent}
                style={styles.confirmDangerBtn}
              >
                {isMarkingAbsent ? 'Applying...' : 'Confirm Mark Absent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal */}
      {editingRow && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>Edit Attendance Record</h2>
            <p style={styles.modalDesc}>
              Staff: <strong>{editingRow.employeeName}</strong> ({editingRow.branchName})
            </p>

            <form onSubmit={handleSaveEdit} style={{ marginTop: '1.25rem', textAlign: 'left' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Attendance Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={styles.input}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Week Off">Week Off</option>
                  <option value="Leave">Leave</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Check In Time (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    placeholder="e.g. 08:58:00"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Check Out Time (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    placeholder="e.g. 19:04:00"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason / Admin Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Duty swap / Manager permission"
                  style={styles.input}
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
                  style={styles.confirmPrimaryBtn}
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
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
    marginBottom: '1.5rem',
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
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  markAbsentBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 700,
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)',
  },
  filtersBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    backgroundColor: '#ffffff',
    padding: '1.25rem',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    marginBottom: '1.5rem',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.6rem 0.85rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  filterInput: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.9rem',
    color: '#0f172a',
    width: '100%',
  },
  filterSelect: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.9rem',
    color: '#0f172a',
    width: '100%',
    cursor: 'pointer',
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
  adminAuditTag: {
    fontSize: '0.7rem',
    color: '#d97706',
    fontWeight: 600,
    marginTop: '2px',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
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
    borderRadius: '24px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalWarnIcon: {
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
    color: '#64748b',
    lineHeight: 1.5,
    margin: '0 0 0.5rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
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
  confirmDangerBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  confirmPrimaryBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
};
