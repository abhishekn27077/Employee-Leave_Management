import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import {
  IconDashboard,
  IconDepartments,
  IconEmployees,
  IconLeaveTypes,
  IconLeaves,
  IconCalendar,
  IconPlus,
  IconClock,
  IconX,
} from './Icons';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const role = user?.role;

  const getSections = () => {
    if (role === 'EMPLOYEE') {
      return [
        {
          title: 'WORKSPACE',
          items: [
            { to: '/employee/dashboard', label: 'Dashboard', icon: <IconDashboard size={17} /> },
            { to: '/leaves', label: 'My Leaves', icon: <IconLeaves size={17} /> },
            { to: '/apply-leave', label: 'Apply Leave', icon: <IconPlus size={17} /> },
            { to: '/balances', label: 'Leave Balance', icon: <IconCalendar size={17} /> },
            { to: '/holidays', label: 'Holidays', icon: <IconCalendar size={17} /> },
            { to: '/availability', label: 'Team Availability', icon: <IconDashboard size={17} /> },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { to: '/profile', label: 'My Profile', icon: <IconEmployees size={17} /> },
          ],
        },
      ];
    }

    if (role === 'MANAGER') {
      return [
        {
          title: 'TEAM OPERATIONS',
          items: [
            { to: '/manager/dashboard', label: 'Operations Dashboard', icon: <IconDashboard size={17} /> },
            { to: '/employees', label: 'Department Team', icon: <IconEmployees size={17} /> },
            { to: '/leaves?scope=approvals', label: 'Leave Approvals', icon: <IconClock size={17} /> },
            { to: '/availability', label: 'Team Availability', icon: <IconDashboard size={17} /> },
            { to: '/holidays', label: 'Holiday Calendar', icon: <IconCalendar size={17} /> },
          ],
        },
        {
          title: 'MY SELF-SERVICE',
          items: [
            { to: '/apply-leave', label: 'Apply for Leave', icon: <IconPlus size={17} /> },
            { to: '/leaves?scope=mine', label: 'My Personal Leaves', icon: <IconLeaves size={17} /> },
            { to: '/balances', label: 'My Leave Balance', icon: <IconCalendar size={17} /> },
            { to: '/profile', label: 'My Profile', icon: <IconEmployees size={17} /> },
          ],
        },
      ];
    }

    if (role === 'HR_ADMIN') {
      return [
        {
          title: 'ORGANIZATION',
          items: [
            { to: '/admin/dashboard', label: 'Overview Dashboard', icon: <IconDashboard size={17} /> },
            { to: '/employees', label: 'Employee Directory', icon: <IconEmployees size={17} /> },
            { to: '/departments', label: 'Departments', icon: <IconDepartments size={17} /> },
            { to: '/availability', label: 'Workforce Availability', icon: <IconDashboard size={17} /> },
          ],
        },
        {
          title: 'LEAVE ADMINISTRATION',
          items: [
            { to: '/leaves', label: 'All Leave Requests', icon: <IconLeaves size={17} /> },
            { to: '/leave-types', label: 'Leave Types', icon: <IconLeaveTypes size={17} /> },
            { to: '/leave-policies', label: 'Leave Policies', icon: <IconLeaveTypes size={17} /> },
            { to: '/balances', label: 'Leave Balances', icon: <IconCalendar size={17} /> },
            { to: '/adjustments', label: 'Balance Adjustments', icon: <IconPlus size={17} /> },
            { to: '/holidays', label: 'Public Holidays', icon: <IconCalendar size={17} /> },
          ],
        },
        {
          title: 'GOVERNANCE',
          items: [
            { to: '/audit', label: 'Audit History', icon: <IconClock size={17} /> },
            { to: '/profile', label: 'Admin Profile', icon: <IconEmployees size={17} /> },
          ],
        },
      ];
    }

    return [
      {
        title: 'AUTHENTICATION',
        items: [
          { to: '/login', label: 'Sign In', icon: <IconDashboard size={17} /> },
        ],
      },
    ];
  };

  const sections = getSections();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Main Navigation">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="brand-info">
            <span className="brand-title" style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              LeaveTrack
            </span>
            <span className="brand-subtitle" style={{ fontSize: '11px', color: '#94a3b8' }}>
              {role === 'HR_ADMIN' ? 'HR Administration' : role === 'MANAGER' ? 'Manager Portal' : 'Employee Portal'}
            </span>
          </div>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onClose}
            aria-label="Close sidebar navigation"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {sections.map((sec, secIdx) => (
            <div key={sec.title || secIdx} className="sidebar-nav-section" style={{ padding: '12px 12px 4px' }}>
              <span className="sidebar-section-title" style={{ fontSize: '10.5px', letterSpacing: '0.06em', color: '#64748b' }}>
                {sec.title}
              </span>
              <nav className="sidebar-nav" style={{ gap: '3px', marginTop: '4px' }}>
                {sec.items.map((item, idx) =>
                  item.action ? (
                    <button
                      key={`action-${item.label}-${idx}`}
                      type="button"
                      onClick={() => {
                        onClose();
                        item.action();
                      }}
                      className="sidebar-nav-item"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        font: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-label">{item.label}</span>
                    </button>
                  ) : (
                    <NavLink
                      key={`${item.to}-${item.label}-${idx}`}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `sidebar-nav-item ${isActive ? 'active' : ''}`
                      }
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                  )
                )}
              </nav>
            </div>
          ))}
        </div>

        {/* Quick Action Button for Non-Admin */}
        {role !== 'HR_ADMIN' && (
          <div style={{ padding: '0 14px 12px' }}>
            <NavLink
              to="/apply-leave"
              onClick={onClose}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              }}
            >
              <IconPlus size={15} />
              <span>Apply for Leave</span>
            </NavLink>
          </div>
        )}

        {/* User Identity & Logout Footer */}
        <div
          className="sidebar-footer"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 14px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar name={user?.employeeName || user?.username || 'User'} size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.employeeName || user?.username || 'User'}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.departmentName ? `${user.departmentName} • ` : ''}
                {role === 'HR_ADMIN' ? 'HR Admin' : role === 'MANAGER' ? 'Manager' : 'Employee'}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
