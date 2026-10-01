'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  UserCheck,
  UserX,
  X,
  Building2,
  Clock,
  Calendar,
} from 'lucide-react';

interface EmployeeRecord {
  id: number;
  full_name: string;
  branch_id: number;
  branch_name: string;
  shift_id: number;
  shift_name: string;
  weekly_off: string;
  status: 'active' | 'inactive';
}

interface BranchItem {
  id: number;
  name: string;
}

interface ShiftItem {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
}

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function EmployeesView() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [branchId, setBranchId] = useState<number | ''>('');
  const [shiftId, setShiftId] = useState<number | ''>('');
  const [weeklyOff, setWeeklyOff] = useState('Sunday');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eRes, bRes, sRes] = await Promise.all([
        fetch('/api/admin/employees', { cache: 'no-store' }),
        fetch('/api/admin/branches', { cache: 'no-store' }),
        fetch('/api/admin/shifts', { cache: 'no-store' }),
      ]);
      const [eData, bData, sData] = await Promise.all([
        eRes.json(),
        bRes.json(),
        sRes.json(),
      ]);
      if (eRes.ok) setEmployees(eData.employees || []);
      if (bRes.ok) setBranches(bData.branches || []);
      if (sRes.ok) setShifts(sData.shifts || []);
    } catch (err) {
      console.error('Error loading employees data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setFullName('');
    setBranchId(branches[0]?.id || '');
    setShiftId(shifts[0]?.id || '');
    setWeeklyOff('Sunday');
    setStatus('active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setModalMode('edit');
    setEditingId(emp.id);
    setFullName(emp.full_name);
    setBranchId(Number(emp.branch_id) || '');
    setShiftId(Number(emp.shift_id) || '');
    setWeeklyOff(emp.weekly_off || 'Sunday');
    setStatus(emp.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (emp: EmployeeRecord) => {
    const actionWord = emp.status === 'active' ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionWord} ${emp.full_name}?`)) return;

    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, status: data.status } : e))
        );
        setToastMsg(`Employee ${data.status === 'active' ? 'activated' : 'deactivated'} successfully`);
        setTimeout(() => setToastMsg(null), 3000);
        await loadData();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanName = fullName.trim();
    if (!cleanName || !branchId || !shiftId) {
      setFormError('Please fill out all required fields (Name, Branch, and Shift).');
      return;
    }

    try {
      setFormSubmitting(true);
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: cleanName,
            branch_id: Number(branchId),
            shift_id: Number(shiftId),
            weekly_off: weeklyOff,
            status,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to add employee');
          return;
        }

        // Update list immediately from server response
        if (data.employee) {
          setEmployees((prev) => [data.employee, ...prev.filter((e) => e.id !== data.employee.id)]);
        }
        setIsModalOpen(false);
        setToastMsg('Employee added successfully');
        setTimeout(() => setToastMsg(null), 3000);
        await loadData();
      } else if (modalMode === 'edit' && editingId) {
        const res = await fetch(`/api/admin/employees/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: cleanName,
            branch_id: Number(branchId),
            shift_id: Number(shiftId),
            weekly_off: weeklyOff,
            status,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || 'Failed to update employee');
          return;
        }

        // Update list immediately from server response
        if (data.employee) {
          setEmployees((prev) =>
            prev.map((e) => (e.id === data.employee.id ? data.employee : e))
          );
        }
        setIsModalOpen(false);
        setToastMsg('Employee updated successfully');
        setTimeout(() => setToastMsg(null), 3000);
        await loadData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error occurred while saving employee');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            backgroundColor: '#065f46',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.title}>Staff & Employee Directory</h1>
          <p style={styles.subtitle}>
            Manage hotel personnel, assign branches, regular shifts, and weekly offs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={styles.addBtn}
        >
          <UserPlus size={18} /> + Add Employee
        </button>
      </div>

      {/* Employees Table Card */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.centerContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div style={styles.centerContainer}>
            <p style={{ color: '#64748b' }}>No employees registered yet. Click &quot;+ Add Employee&quot; to begin.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Full Name</th>
                  <th style={styles.th}>Assigned Branch</th>
                  <th style={styles.th}>Shift</th>
                  <th style={styles.th}>Weekly Off</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.nameWrap}>
                        <div style={styles.avatarMini}>{emp.full_name.charAt(0)}</div>
                        <strong style={{ color: '#0f172a' }}>{emp.full_name}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>{emp.branch_name}</td>
                    <td style={styles.td}>{emp.shift_name}</td>
                    <td style={styles.td}>{emp.weekly_off}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: emp.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                          color: emp.status === 'active' ? '#065f46' : '#64748b',
                        }}
                      >
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionRow}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          style={styles.actionEditBtn}
                          title="Edit Employee"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          style={{
                            ...styles.actionToggleBtn,
                            color: emp.status === 'active' ? '#dc2626' : '#16a34a',
                          }}
                          title={emp.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {emp.status === 'active' ? 'Deactivate' : 'Activate'}
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

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === 'add' ? 'Add New Employee' : 'Edit Employee Details'}
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
              {formError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {formError}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Assigned Branch *</label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(Number(e.target.value) || '')}
                  style={styles.input}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Assigned Shift *</label>
                <select
                  required
                  value={shiftId}
                  onChange={(e) => setShiftId(Number(e.target.value) || '')}
                  style={styles.input}
                >
                  <option value="">Select Shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Weekly Off Day</label>
                <select
                  value={weeklyOff}
                  onChange={(e) => setWeeklyOff(e.target.value)}
                  style={styles.input}
                >
                  {WEEK_DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={styles.input}
                >
                  <option value="active">Active (Appears on QR terminal)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

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
                    ? 'Add Employee'
                    : 'Save Changes'}
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
  nameWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatarMini: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
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
  actionEditBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  actionToggleBtn: {
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
    maxWidth: '480px',
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
};
