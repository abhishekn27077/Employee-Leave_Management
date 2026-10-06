import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconMenu, IconPlus, IconEmployees } from './Icons';
import Avatar from './Avatar';

export default function Header({ onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/employee/dashboard':
        return 'Employee Dashboard';
      case '/manager/dashboard':
        return 'Manager Dashboard';
      case '/admin/dashboard':
        return 'Workforce Overview';
      case '/profile':
        return 'My Profile';
      case '/departments':
        return 'Department Directory';
      case '/employees':
        return user?.role === 'MANAGER' ? 'My Department Team' : 'Employee Directory';
      case '/leave-types':
        return 'Leave Types';
      case '/leave-policies':
        return 'Leave Policies';
      case '/leaves':
        return user?.role === 'EMPLOYEE' ? 'My Leave Requests' : 'Leave Management';
      case '/apply-leave':
        return 'New Leave Request';
      case '/balances':
        return 'Leave Balances';
      case '/adjustments':
        return 'Leave Adjustments';
      case '/audit':
        return 'Audit History';
      case '/holidays':
        return 'Holiday Calendar';
      case '/availability':
        return 'Team Availability';
      default:
        return 'Workforce Portal';
    }
  };

  const formatRole = (role) => {
    switch (role) {
      case 'HR_ADMIN':
        return 'HR Admin';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Employee';
      default:
        return role || 'User';
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'HR_ADMIN':
        return { backgroundColor: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' };
      case 'MANAGER':
        return { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' };
      case 'EMPLOYEE':
      default:
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' };
    }
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.employeeName || user?.username || 'User';
  const roleBadgeStyle = getRoleBadgeStyle(user?.role);
  const employeeId = user?.employeeCode || null;
  const department = user?.departmentName || null;

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open sidebar navigation"
        >
          <IconMenu size={20} />
        </button>
        <div className="header-breadcrumb">
          <span className="breadcrumb-root">LeaveTrack</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{getPageTitle()}</span>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Quick Action: Apply Leave (visible for all authenticated users who may need to request leave) */}
        <Link to="/apply-leave" className="btn btn-primary btn-sm header-action-btn">
          <IconPlus size={15} />
          <span>Apply Leave</span>
        </Link>

        {/* Profile Menu Trigger & Dropdown */}
        {user && (
          <div className="profile-menu-container" ref={profileMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
              aria-label="Open profile menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.3125rem 0.625rem',
                backgroundColor: profileMenuOpen ? '#f1f5f9' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="User Account &amp; Profile"
            >
              <Avatar name={displayName} size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                    {displayName}
                  </span>
                  {employeeId && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: '#64748b',
                        backgroundColor: '#e2e8f0',
                        padding: '0.0625rem 0.3125rem',
                        borderRadius: '0.25rem',
                      }}
                    >
                      {employeeId}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.0625rem 0.375rem',
                      borderRadius: '0.25rem',
                      border: '1px solid',
                      ...roleBadgeStyle,
                    }}
                  >
                    {formatRole(user.role)}
                  </span>
                  {user.role === 'HR_ADMIN' ? (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: '#6366f1',
                        backgroundColor: '#eef2ff',
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '0.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.1875rem',
                        fontWeight: 600,
                      }}
                      title="Organization-wide administrative access"
                    >
                      <span>Org-wide Access</span>
                    </span>
                  ) : department ? (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: '#475569',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.1875rem',
                      }}
                    >
                      <span>{department}{user.role === 'MANAGER' ? ' (Team Scope)' : ''}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: '#64748b',
                  transition: 'transform 0.15s ease',
                  transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div
                className="profile-dropdown-card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '280px',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.875rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 100,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
                role="menu"
              >
                {/* Header identity details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <Avatar name={displayName} size="md" />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email || user.username}
                    </span>
                  </div>
                </div>

                {/* Account metadata: Role, Department, Employee ID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', backgroundColor: '#f8fafc', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Role</span>
                    <span style={{ fontWeight: 700, ...roleBadgeStyle, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', border: '1px solid' }}>
                      {formatRole(user.role)}
                    </span>
                  </div>
                  {department && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Department</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{department}</span>
                    </div>
                  )}
                  {employeeId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Employee ID</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{employeeId}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '0.25rem', marginTop: '0.125rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Scope</span>
                    <span style={{ fontWeight: 600, color: user.role === 'HR_ADMIN' ? '#6366f1' : '#047857' }}>
                      {user.role === 'HR_ADMIN' ? 'Organization-wide' : user.role === 'MANAGER' ? 'Department Team' : 'Self-service'}
                    </span>
                  </div>
                </div>

                {/* Navigation Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      color: '#1e293b',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'background-color 0.15s',
                    }}
                    className="profile-menu-item"
                    role="menuitem"
                  >
                    <IconEmployees size={16} />
                    <span>My Profile</span>
                  </Link>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #fee2e2',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    role="menuitem"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Direct quick logout button */}
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of LeaveTrack"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
