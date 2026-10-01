'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface BranchItem {
  id: number;
  name: string;
}

interface EmployeeItem {
  id: number;
  full_name: string;
}

interface MonthlySummary {
  present: number;
  absent: number;
  weekOff: number;
  leave: number;
  halfDay: number;
  workingDays: number;
  totalDays: number;
}

interface DailyLog {
  date: string;
  dayNumber: number;
  dayName: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  shiftName: string;
  verification: string | null;
}

interface EmployeeMonthlyReport {
  employeeId: number;
  employeeName: string;
  branchId: number;
  branchName: string;
  weeklyOff: string;
  summary: MonthlySummary;
  dailyLogs: DailyLog[];
}

export function MonthlyReportView() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [reports, setReports] = useState<EmployeeMonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Drilldown Modal
  const [drilldownEmp, setDrilldownEmp] = useState<EmployeeMonthlyReport | null>(null);

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
        console.error('Error fetching filters:', err);
      }
    }
    loadFilters();
  }, []);

  const loadMonthly = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/reports/monthly?month=${selectedMonth}&branchId=${selectedBranch}&employeeId=${selectedEmployee}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error loading monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthly();
  }, [selectedMonth, selectedBranch, selectedEmployee]);

  const handleExportCsv = () => {
    const exportUrl = `/api/admin/reports/export?type=monthly&month=${selectedMonth}&branchId=${selectedBranch}&employeeId=${selectedEmployee}`;
    window.location.href = exportUrl;
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase().replace(/\s+/g, '-');
    return `status-pill status-${s}`;
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <div style={styles.topHeader}>
        <div>
          <h1 style={styles.title}>Monthly Attendance Matrix</h1>
          <p style={styles.subtitle}>
            Comprehensive monthly muster roll, working days calculation, and staff drilldown logs.
          </p>
        </div>

        <div style={styles.headerActions} className="no-print">
          <button
            type="button"
            onClick={handleExportCsv}
            style={styles.exportBtn}
          >
            <Download size={16} /> Export Monthly CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={styles.printBtn}
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filtersBar} className="no-print">
        <div style={styles.filterItem}>
          <label style={styles.filterLabel}>Month (YYYY-MM)</label>
          <div style={styles.inputWrap}>
            <Calendar size={16} color="#64748b" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
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
      </div>

      {/* Monthly Summary Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            Summary Muster: {selectedMonth}
          </h2>
          <span style={styles.badgeInfo}>
            {reports.length} Employee(s)
          </span>
        </div>

        {loading ? (
          <div style={styles.centerContainer}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>Compiling monthly register...</p>
          </div>
        ) : reports.length === 0 ? (
          <div style={styles.centerContainer}>
            <p style={{ color: '#64748b' }}>No employees found for this criteria.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Employee Name</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Weekly Off</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Present</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Absent</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Week Off</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Leave</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Half Day</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Working Days</th>
                  <th style={{ ...styles.th, textAlign: 'right' }} className="no-print">Drilldown</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((emp) => (
                  <tr
                    key={emp.employeeId}
                    style={styles.tr}
                    onClick={() => setDrilldownEmp(emp)}
                  >
                    <td style={styles.td}>
                      <strong style={{ color: '#0f172a' }}>{emp.employeeName}</strong>
                    </td>
                    <td style={styles.td}>{emp.branchName}</td>
                    <td style={styles.td}>{emp.weeklyOff}</td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#065f46', fontWeight: 700 }}>
                      {emp.summary.present}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#991b1b', fontWeight: 700 }}>
                      {emp.summary.absent}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#3730a3', fontWeight: 600 }}>
                      {emp.summary.weekOff}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#92400e', fontWeight: 600 }}>
                      {emp.summary.leave}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#5b21b6', fontWeight: 600 }}>
                      {emp.summary.halfDay}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.workingDaysPill}>
                        {emp.summary.workingDays}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }} className="no-print">
                      <button
                        type="button"
                        style={styles.viewLogBtn}
                      >
                        Logs <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drilldown Modal (Click on employee to see day-by-day log) */}
      {drilldownEmp && (
        <div style={styles.modalBackdrop}>
          <div style={styles.drilldownModal}>
            <div style={styles.drilldownHeader}>
              <div>
                <span style={styles.empBadge}>STAFF MONTHLY DRILLDOWN</span>
                <h2 style={styles.drilldownTitle}>{drilldownEmp.employeeName}</h2>
                <p style={styles.drilldownSubtitle}>
                  Branch: {drilldownEmp.branchName} | Month: {selectedMonth} | Weekly Off: {drilldownEmp.weeklyOff}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownEmp(null)}
                style={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick stats ribbon */}
            <div style={styles.statsRibbon}>
              <div style={styles.ribbonItem}>
                <span>Present</span>
                <strong>{drilldownEmp.summary.present}</strong>
              </div>
              <div style={styles.ribbonItem}>
                <span>Absent</span>
                <strong>{drilldownEmp.summary.absent}</strong>
              </div>
              <div style={styles.ribbonItem}>
                <span>Week Off</span>
                <strong>{drilldownEmp.summary.weekOff}</strong>
              </div>
              <div style={styles.ribbonItem}>
                <span>Leave</span>
                <strong>{drilldownEmp.summary.leave}</strong>
              </div>
              <div style={styles.ribbonItem}>
                <span>Working Days</span>
                <strong style={{ color: '#16a34a' }}>{drilldownEmp.summary.workingDays}</strong>
              </div>
            </div>

            {/* Daily entries list */}
            <div style={styles.logList}>
              {drilldownEmp.dailyLogs.map((log) => (
                <div key={log.date} style={styles.logItem}>
                  <div style={styles.logDateWrap}>
                    <strong style={styles.logDateNum}>Day {log.dayNumber}</strong>
                    <span style={styles.logDayName}>{log.dayName} ({log.date})</span>
                  </div>

                  <div style={styles.logStatusWrap}>
                    <span className={getStatusBadgeClass(log.status)}>
                      {log.status}
                    </span>
                  </div>

                  <div style={styles.logTimes}>
                    {log.checkIn ? (
                      <span style={styles.punchTime}>
                        In: <strong>{log.checkIn}</strong>
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No check in</span>
                    )}
                    {log.checkOut && (
                      <span style={styles.punchTime}>
                        Out: <strong>{log.checkOut}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
  exportBtn: {
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
  printBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  filtersBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
  cardHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  badgeInfo: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '4px 10px',
    borderRadius: '9999px',
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
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.9rem',
    color: '#334155',
  },
  workingDaysPill: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    fontWeight: 700,
    borderRadius: '9999px',
    fontSize: '0.85rem',
  },
  viewLogBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '1px solid #e2e8f0',
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
  drilldownModal: {
    width: '100%',
    maxWidth: '680px',
    maxHeight: '90vh',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  drilldownHeader: {
    padding: '1.75rem 2rem 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  empBadge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#dc2626',
    letterSpacing: '0.06em',
    marginBottom: '0.25rem',
  },
  drilldownTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  drilldownSubtitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  closeBtn: {
    padding: '6px',
    color: '#64748b',
    borderRadius: '8px',
  },
  statsRibbon: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.5rem',
    padding: '1rem 2rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  ribbonItem: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  logList: {
    padding: '1.25rem 2rem',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  logItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  logDateWrap: {
    display: 'flex',
    flexDirection: 'column',
  },
  logDateNum: {
    fontSize: '0.9rem',
    color: '#0f172a',
  },
  logDayName: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  logStatusWrap: {
    minWidth: '100px',
    textAlign: 'center',
  },
  logTimes: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  punchTime: {
    fontSize: '0.8rem',
    color: '#334155',
  },
};
