'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Printer,
} from 'lucide-react';

interface BranchItem {
  id: number;
  name: string;
}

interface EmployeeItem {
  id: number;
  full_name: string;
}

export function ExportView() {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const currentMonthStr = todayStr.slice(0, 7);

  const [exportType, setExportType] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState<string>(todayStr);
  const [month, setMonth] = useState<string>(currentMonthStr);
  const [branchId, setBranchId] = useState<string>('all');
  const [employeeId, setEmployeeId] = useState<string>('all');

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  useEffect(() => {
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
        console.error('Error loading filters:', err);
      }
    }
    loadFilters();
  }, []);

  const handleDownload = () => {
    let url = `/api/admin/reports/export?type=${exportType}&branchId=${branchId}&employeeId=${employeeId}`;
    if (exportType === 'daily') {
      url += `&date=${date}`;
    } else {
      url += `&month=${month}`;
    }
    window.location.href = url;
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.title}>Export & Reports Hub</h1>
          <p style={styles.subtitle}>
            Generate and export official attendance reports in standard CSV / Excel spreadsheet formats.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Main Export Generator Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.iconCircle}>
              <FileSpreadsheet size={24} color="#dc2626" />
            </div>
            <div>
              <h2 style={styles.cardTitle}>Custom CSV / Excel Export</h2>
              <p style={styles.cardSubtitle}>
                Select criteria to download a formatted attendance spreadsheet.
              </p>
            </div>
          </div>

          <div style={styles.formBody}>
            {/* Report Scope */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Export Scope</label>
              <div style={styles.scopeToggle}>
                <button
                  type="button"
                  onClick={() => setExportType('daily')}
                  style={{
                    ...styles.scopeBtn,
                    backgroundColor: exportType === 'daily' ? '#0f172a' : '#f8fafc',
                    color: exportType === 'daily' ? '#ffffff' : '#475569',
                    fontWeight: exportType === 'daily' ? 700 : 500,
                  }}
                >
                  Daily Attendance Report
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('monthly')}
                  style={{
                    ...styles.scopeBtn,
                    backgroundColor: exportType === 'monthly' ? '#0f172a' : '#f8fafc',
                    color: exportType === 'monthly' ? '#ffffff' : '#475569',
                    fontWeight: exportType === 'monthly' ? 700 : 500,
                  }}
                >
                  Monthly Attendance Report
                </button>
              </div>
            </div>

            {/* Date / Month Picker */}
            {exportType === 'daily' ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Attendance Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={styles.input}
                />
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Attendance Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}

            {/* Branch Filter */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Branch Filter</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                style={styles.input}
              >
                <option value="all">All Hotel Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Filter */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Employee Filter</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                style={styles.input}
              >
                <option value="all">All Active Staff</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleDownload}
              style={styles.downloadBtn}
            >
              <Download size={20} /> Download CSV Spreadsheet
            </button>
          </div>
        </div>

        {/* Info & Compliance Card */}
        <div style={styles.sideCard}>
          <h3 style={styles.sideTitle}>Report Schema & Standards</h3>
          <p style={styles.sideText}>
            Every exported report strictly conforms to official hotel audit standards.
          </p>

          <div style={styles.checklist}>
            <div style={styles.checkItem}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Staff Name & Hotel Branch</span>
            </div>
            <div style={styles.checkItem}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Shift Timing & Assigned Duty</span>
            </div>
            <div style={styles.checkItem}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Verified Check In & Check Out Times</span>
            </div>
            <div style={styles.checkItem}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Final Attendance Status (Present/Absent/Week Off)</span>
            </div>
            <div style={styles.checkItem}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Management Verification Flag</span>
            </div>
            <div style={styles.checkItem}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Excluded deleted photo data for staff privacy</span>
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
    gridTemplateColumns: 'minmax(340px, 580px) 1fr',
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
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    backgroundColor: '#fee2e2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  formGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.4rem',
  },
  scopeToggle: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
  },
  scopeBtn: {
    padding: '0.75rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    border: '1px solid #e2e8f0',
    transition: 'all 0.15s ease',
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
  downloadBtn: {
    width: '100%',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '1rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '14px',
    fontSize: '1.05rem',
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
  },
  sideCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '2rem',
    border: '1px solid #e2e8f0',
    alignSelf: 'start',
  },
  sideTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 0.5rem',
  },
  sideText: {
    fontSize: '0.85rem',
    color: '#64748b',
    lineHeight: 1.5,
    marginBottom: '1.5rem',
  },
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.875rem',
    color: '#334155',
  },
};
