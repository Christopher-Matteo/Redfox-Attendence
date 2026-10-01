'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  CalendarCheck2,
  X,
  UserCheck,
} from 'lucide-react';

interface ShiftRecord {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  assigned_employees_count: number;
}

interface EmployeeItem {
  id: number;
  full_name: string;
  branch_name: string;
  shift_name: string;
}

export function ShiftsView() {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Shift Modal (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Temporary Shift Change Modal
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [tempEmpId, setTempEmpId] = useState<number | ''>('');
  const [tempShiftId, setTempShiftId] = useState<number | ''>('');
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [tempDate, setTempDate] = useState<string>(tomorrowStr);
  const [tempSubmitting, setTempSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.all([
        fetch('/api/admin/shifts', { cache: 'no-store' }),
        fetch('/api/admin/employees', { cache: 'no-store' }),
      ]);
      const [sData, eData] = await Promise.all([sRes.json(), eRes.json()]);
      if (sRes.ok) setShifts(sData.shifts || []);
      if (eRes.ok) setEmployees(eData.employees || []);
    } catch (err) {
      console.error('Error loading shifts data:', err);
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
    setName('');
    setStartTime('09:00');
    setEndTime('19:00');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: ShiftRecord) => {
    setModalMode('edit');
    setEditingId(shift.id);
    setName(shift.name);
    setStartTime(shift.start_time);
    setEndTime(shift.end_time);
    setIsModalOpen(true);
  };

  const handleDeleteShift = async (shift: ShiftRecord) => {
    if (shift.assigned_employees_count > 0) {
      alert(`Cannot delete shift: ${shift.assigned_employees_count} staff member(s) are assigned to it. Please reassign them first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${shift.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/shifts/${shift.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => s.id !== shift.id));
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete shift');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startTime || !endTime) {
      alert('Please fill out all fields');
      return;
    }

    try {
      setFormSubmitting(true);
      if (modalMode === 'add') {
        const res = await fetch('/api/admin/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), start_time: startTime, end_time: endTime }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to add shift');
          return;
        }
        if (data.shift) {
          setShifts((prev) => [...prev, data.shift]);
        }
      } else if (modalMode === 'edit' && editingId) {
        const res = await fetch(`/api/admin/shifts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), start_time: startTime, end_time: endTime }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to update shift');
          return;
        }
        if (data.shift) {
          setShifts((prev) => prev.map((s) => (s.id === data.shift.id ? data.shift : s)));
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch {
      alert('Network error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenTempModal = () => {
    setTempEmpId(employees[0]?.id || '');
    setTempShiftId(shifts[0]?.id || '');
    setTempDate(tomorrowStr);
    setIsTempModalOpen(true);
  };

  const handleTempSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempEmpId || !tempShiftId || !tempDate) {
      alert('Please select staff, shift, and date');
      return;
    }

    try {
      setTempSubmitting(true);
      const res = await fetch('/api/admin/shifts/temp-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: Number(tempEmpId),
          shift_id: Number(tempShiftId),
          effective_date: tempDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Temporary shift override scheduled successfully!');
        setIsTempModalOpen(false);
        await loadData();
      } else {
        alert(data.error || 'Failed to schedule shift change');
      }
    } catch {
      alert('Network error');
    } finally {
      setTempSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.title}>Hotel Shift Configuration</h1>
          <p style={styles.subtitle}>
            Manage hotel roster shifts, timings, and schedule temporary date-specific shift overrides.
          </p>
        </div>

        <div style={styles.btnRow}>
          <button
            type="button"
            onClick={handleOpenTempModal}
            style={styles.tempBtn}
          >
            <CalendarCheck2 size={16} /> Temporary Shift Override
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={styles.addBtn}
          >
            <Plus size={18} /> + Add Shift
          </button>
        </div>
      </div>

      {/* Shifts Table */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.centerContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Loading shifts...</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Shift Name</th>
                  <th style={styles.th}>Start Time</th>
                  <th style={styles.th}>End Time</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Staff Assigned</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong style={{ color: '#0f172a' }}>{s.name}</strong>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.timeBadge}>{s.start_time}</code>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.timeBadge}>{s.end_time}</code>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.countBadge}>{s.assigned_employees_count} staff</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionRow}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          style={styles.editBtn}
                          title="Edit Shift"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(s)}
                          disabled={s.assigned_employees_count > 0}
                          style={{
                            ...styles.delBtn,
                            opacity: s.assigned_employees_count > 0 ? 0.35 : 1,
                            cursor: s.assigned_employees_count > 0 ? 'not-allowed' : 'pointer',
                          }}
                          title={s.assigned_employees_count > 0 ? 'Shift is assigned to employees' : 'Delete Shift'}
                        >
                          <Trash2 size={14} />
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

      {/* Add / Edit Shift Modal */}
      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === 'add' ? 'Add Shift' : 'Edit Shift Details'}
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
                <label style={styles.label}>Shift Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Shift"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>End Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={styles.input}
                  />
                </div>
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
                    ? 'Create Shift'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Shift Override Modal */}
      {isTempModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.tempBadge}>ONE-DAY SCHEDULE OVERRIDE</span>
                <h2 style={styles.modalTitle}>Temporary Shift Change</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsTempModalOpen(false)}
                style={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTempSubmit} style={styles.modalBody}>
              <p style={styles.tempDesc}>
                Set a specific shift for a single date. After that date, the staff member&apos;s regular assigned shift remains unchanged.
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Staff Member *</label>
                <select
                  required
                  value={tempEmpId}
                  onChange={(e) => setTempEmpId(Number(e.target.value))}
                  style={styles.input}
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.branch_name} • Default: {e.shift_name})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Target Shift for this Date *</label>
                <select
                  required
                  value={tempShiftId}
                  onChange={(e) => setTempShiftId(Number(e.target.value))}
                  style={styles.input}
                >
                  <option value="">Select Target Shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Effective Date *</label>
                <input
                  type="date"
                  required
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsTempModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tempSubmitting}
                  style={styles.submitBtn}
                >
                  {tempSubmitting ? 'Saving...' : 'Apply Temporary Shift'}
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
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  tempBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '0.85rem',
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
  timeBadge: {
    padding: '3px 8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#0f172a',
    fontWeight: 600,
  },
  countBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  editBtn: {
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
  delBtn: {
    padding: '6px 10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '0.8rem',
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
  tempBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#dc2626',
    display: 'block',
    marginBottom: '0.2rem',
  },
  tempDesc: {
    fontSize: '0.85rem',
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: '1rem',
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
