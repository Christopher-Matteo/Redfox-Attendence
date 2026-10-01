'use client';

import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  Building2,
  Clock,
  Download,
  Settings,
  LogOut,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'pending'
  | 'daily'
  | 'monthly'
  | 'employees'
  | 'branches'
  | 'shifts'
  | 'export'
  | 'settings';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingCount: number;
  adminName: string;
  onLogout: () => void;
}

export function AdminSidebar({
  currentTab,
  onSelectTab,
  pendingCount,
  adminName,
  onLogout,
}: SidebarProps) {
  const menuItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    {
      id: 'pending',
      label: 'Pending Verification',
      icon: <ShieldAlert size={20} />,
      badge: pendingCount,
    },
    { id: 'daily', label: 'Daily Attendance', icon: <CalendarCheck size={20} /> },
    { id: 'monthly', label: 'Monthly Report', icon: <FileSpreadsheet size={20} /> },
    { id: 'employees', label: 'Employees', icon: <Users size={20} /> },
    { id: 'branches', label: 'Branches', icon: <Building2 size={20} /> },
    { id: 'shifts', label: 'Shifts', icon: <Clock size={20} /> },
    { id: 'export', label: 'Reports & Export', icon: <Download size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.logoIcon}>🦊</div>
        <div style={styles.brandTextWrap}>
          <span style={styles.brandTitle}>REDFOX</span>
          <span style={styles.brandSubtitle}>ATTENDANCE ADMIN</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={styles.nav}>
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              style={{
                ...styles.navItem,
                backgroundColor: isActive ? '#dc2626' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <div style={styles.navItemLeft}>
                {item.icon}
                <span style={styles.navLabel}>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: isActive ? '#ffffff' : '#dc2626',
                    color: isActive ? '#dc2626' : '#ffffff',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div style={styles.userFooter}>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>{adminName.charAt(0).toUpperCase()}</div>
          <div style={styles.userDetails}>
            <span style={styles.userName}>{adminName}</span>
            <span style={styles.userRole}>Management Admin</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Sign Out"
          style={styles.logoutBtn}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1.25rem 1rem',
    borderRight: '1px solid #1e293b',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0.75rem 0.5rem 1.5rem',
    borderBottom: '1px solid #1e293b',
  },
  logoIcon: {
    fontSize: '1.75rem',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrap: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.05em',
  },
  brandSubtitle: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.08em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    margin: '1.25rem 0',
    flex: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  navItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navLabel: {
    whiteSpace: 'nowrap',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  userFooter: {
    paddingTop: '1rem',
    borderTop: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#334155',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  userRole: {
    fontSize: '0.7rem',
    color: '#64748b',
  },
  logoutBtn: {
    color: '#94a3b8',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
