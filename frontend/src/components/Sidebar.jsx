import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
            { to: '/employee/dashboard', label: 'Dashboard', icon: <IconDashboard size={18} /> },
            { to: '/leaves', label: 'My Leaves', icon: <IconLeaves size={18} /> },
            { to: '/apply-leave', label: 'Apply Leave', icon: <IconPlus size={18} /> },
            { to: '/balances', label: 'Leave Balance', icon: <IconCalendar size={18} /> },
            { to: '/holidays', label: 'Holidays', icon: <IconCalendar size={18} /> },
            { to: '/availability', label: 'Team Availability', icon: <IconDashboard size={18} /> },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { to: '/profile', label: 'My Profile', icon: <IconEmployees size={18} /> },
          ],
        },
      ];
    }

    if (role === 'MANAGER') {
      return [
        {
          title: 'WORKSPACE',
          items: [
            { to: '/manager/dashboard', label: 'Dashboard', icon: <IconDashboard size={18} /> },
            { to: '/employees', label: 'My Team', icon: <IconEmployees size={18} /> },
            { to: '/leaves?scope=approvals', label: 'Leave Approvals', icon: <IconClock size={18} /> },
            { to: '/availability', label: 'Team Availability', icon: <IconDashboard size={18} /> },
            { to: '/holidays', label: 'Holidays', icon: <IconCalendar size={18} /> },
          ],
        },
        {
          title: 'MY ACCOUNT',
          items: [
            { to: '/apply-leave', label: 'Apply Leave', icon: <IconPlus size={18} /> },
            { to: '/leaves?scope=mine', label: 'My Leaves', icon: <IconLeaves size={18} /> },
            { to: '/balances', label: 'Leave Balance', icon: <IconCalendar size={18} /> },
            { to: '/profile', label: 'My Profile', icon: <IconEmployees size={18} /> },
          ],
        },
      ];
    }

    if (role === 'HR_ADMIN') {
      return [
        {
          title: 'WORKFORCE',
          items: [
            { to: '/admin/dashboard', label: 'Dashboard', icon: <IconDashboard size={18} /> },
            { to: '/employees', label: 'Employees', icon: <IconEmployees size={18} /> },
            { to: '/departments', label: 'Departments', icon: <IconDepartments size={18} /> },
            { to: '/availability', label: 'Team Availability', icon: <IconDashboard size={18} /> },
          ],
        },
        {
          title: 'LEAVE MANAGEMENT',
          items: [
            { to: '/leaves', label: 'Leave Requests', icon: <IconLeaves size={18} /> },
            { to: '/leave-types', label: 'Leave Types', icon: <IconLeaveTypes size={18} /> },
            { to: '/leave-policies', label: 'Leave Policies', icon: <IconLeaveTypes size={18} /> },
            { to: '/balances', label: 'Leave Balances', icon: <IconCalendar size={18} /> },
            { to: '/adjustments', label: 'Leave Adjustments', icon: <IconPlus size={18} /> },
            { to: '/holidays', label: 'Holidays', icon: <IconCalendar size={18} /> },
          ],
        },
        {
          title: 'GOVERNANCE',
          items: [
            { to: '/audit', label: 'Audit History', icon: <IconClock size={18} /> },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { to: '/profile', label: 'My Profile', icon: <IconEmployees size={18} /> },
            {
              action: logout,
              label: 'Logout',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              ),
            },
          ],
        },
      ];
    }

    return [
      {
        title: 'AUTHENTICATION',
        items: [
          { to: '/login', label: 'Sign In', icon: <IconDashboard size={18} /> },
        ],
      },
    ];
  };

  const sections = getSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="brand-info">
            <span className="brand-title">LeaveTrack</span>
            <span className="brand-subtitle">
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

        <div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto' }}>
          {sections.map((sec, secIdx) => (
            <div key={sec.title || secIdx} className="sidebar-nav-section" style={{ padding: '14px 12px 6px' }}>
              <span className="sidebar-section-title">{sec.title}</span>
              <nav className="sidebar-nav">
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
                        color: 'inherit',
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

        {role !== 'HR_ADMIN' && (
          <div className="sidebar-quick-action" style={{ paddingTop: '10px' }}>
            <NavLink
              to="/apply-leave"
              onClick={onClose}
              className={({ isActive }) =>
                `btn btn-primary sidebar-apply-btn ${isActive ? 'active' : ''}`
              }
            >
              <IconPlus size={16} />
              <span>Apply for Leave</span>
            </NavLink>
          </div>
        )}

        <div className="sidebar-footer" style={{ borderTop: '1px solid #1e293b', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.employeeName || user?.username || 'User'}
              </span>
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                {role || 'EMPLOYEE'} &bull; {user?.departmentName || 'Staff'}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Sign Out"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
