import React from 'react';
import { NavLink } from 'react-router-dom';
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

function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: <IconDashboard size={18} />, end: true },
    { to: '/departments', label: 'Departments', icon: <IconDepartments size={18} /> },
    { to: '/employees', label: 'Employees', icon: <IconEmployees size={18} /> },
    { to: '/leave-types', label: 'Leave Types', icon: <IconLeaveTypes size={18} /> },
    { to: '/leaves', label: 'Leave Requests', icon: <IconLeaves size={18} />, end: true },
    { to: '/balances', label: 'Leave Balances', icon: <IconLeaves size={18} /> },
    { to: '/adjustments', label: 'Leave Adjustments', icon: <IconPlus size={18} /> },
    { to: '/audit', label: 'Audit History', icon: <IconClock size={18} /> },
    { to: '/holidays', label: 'Holiday Calendar', icon: <IconCalendar size={18} /> },
    { to: '/availability', label: 'Team Availability', icon: <IconDashboard size={18} /> },
  ];

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
            <span className="brand-subtitle">Workforce HR</span>
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

        <div className="sidebar-nav-section">
          <span className="sidebar-section-title">Navigation</span>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-quick-action">
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

        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className="status-ping" aria-hidden="true"></span>
            <div className="status-text">
              <span className="status-title">System Online</span>
              <span className="status-desc">Spring Boot & MySQL</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
