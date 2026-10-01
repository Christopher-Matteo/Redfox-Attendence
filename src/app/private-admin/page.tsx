'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar, AdminTab } from '@/components/admin/sidebar';
import { DashboardView } from '@/components/admin/dashboard-view';
import { PendingVerificationView } from '@/components/admin/pending-verification-view';
import { DailyAttendanceView } from '@/components/admin/daily-attendance-view';
import { MonthlyReportView } from '@/components/admin/monthly-report-view';
import { EmployeesView } from '@/components/admin/employees-view';
import { BranchesView } from '@/components/admin/branches-view';
import { ShiftsView } from '@/components/admin/shifts-view';
import { ExportView } from '@/components/admin/export-view';
import { SettingsView } from '@/components/admin/settings-view';

export default function AdminPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [adminName, setAdminName] = useState<string>('Hotel Management');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check authentication session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) {
          router.replace('/private-admin/login');
          return;
        }
        const data = await res.json();
        if (data.admin) {
          setAdminName(data.admin.fullName || data.admin.username);
        }
      } catch {
        router.replace('/private-admin/login');
      } finally {
        setIsAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Load pending verification count for sidebar badge
  const updatePendingCount = async () => {
    try {
      const res = await fetch('/api/admin/pending-verifications');
      const data = await res.json();
      if (res.ok) {
        setPendingCount(data.count || 0);
      }
    } catch {
      // Ignore background counter errors
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      updatePendingCount();
    }
  }, [isAuthLoading, currentTab]);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.replace('/private-admin/login');
    } catch {
      router.replace('/private-admin/login');
    }
  };

  if (isAuthLoading) {
    return (
      <div style={styles.loadingScreen}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>
          Verifying security credentials...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      {/* Private Admin Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        pendingCount={pendingCount}
        adminName={adminName}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onVerificationUpdate={updatePendingCount}
          />
        )}
        {currentTab === 'pending' && (
          <PendingVerificationView onVerificationDone={updatePendingCount} />
        )}
        {currentTab === 'daily' && <DailyAttendanceView />}
        {currentTab === 'monthly' && <MonthlyReportView />}
        {currentTab === 'employees' && <EmployeesView />}
        {currentTab === 'branches' && <BranchesView />}
        {currentTab === 'shifts' && <ShiftsView />}
        {currentTab === 'export' && <ExportView />}
        {currentTab === 'settings' && <SettingsView adminName={adminName} />}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f8fafc',
  },
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
};
