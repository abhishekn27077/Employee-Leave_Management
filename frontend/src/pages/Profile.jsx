import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeeApi, extractErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import {
  IconPlus,
  IconLeaves,
  IconCalendar,
  IconEmployees,
  IconClock,
  IconCheck,
  IconRefresh,
} from '../components/Icons';

export default function Profile() {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch full employee details from backend using authenticated employeeId
  const fetchEmployeeDetails = async () => {
    if (!user?.employeeId) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await employeeApi.getById(user.employeeId);
      setEmployeeData(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [user?.employeeId]);

  const formatRole = (role) => {
    switch (role) {
      case 'HR_ADMIN':
        return 'HR Administrator';
      case 'MANAGER':
        return 'Department Manager';
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

  // Authoritative identity resolution strictly from authenticated session
  const displayName = employeeData?.name || user?.employeeName || user?.username || 'User';
  const displayEmail = employeeData?.email || user?.email || 'N/A';
  const displayPhone = employeeData?.phone || 'Not Provided';
  const displayCode = employeeData?.employeeId || user?.employeeCode || 'N/A';
  const displayDept = employeeData?.department?.name || user?.departmentName || 'Not Assigned';
  const displayDesignation = employeeData?.designation || user?.designation || 'Staff Member';
  const displayJoiningDate = employeeData?.joiningDate || 'Not Specified';
  const roleBadgeStyle = getRoleBadgeStyle(user?.role);

  return (
    <div className="page-container" style={{ maxWidth: '1020px', margin: '0 auto', padding: '1.5rem' }}>
      <PageHeader
        title="My Profile"
        subtitle="Workforce identity, organizational department assignment, and access credentials"
        badge={user?.role}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchEmployeeDetails}
            disabled={loading}
          >
            <IconRefresh size={16} />
            <span>Refresh</span>
          </button>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Primary Identity Hero Card */}
      <div
        className="content-card"
        style={{
          marginTop: '1.25rem',
          padding: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          background: 'linear-gradient(to right, #ffffff, #f8fafc)',
          borderLeft: '4px solid #2563eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Avatar name={displayName} size="xl" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {displayName}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
                  letterSpacing: '0.05em',
                  ...roleBadgeStyle,
                }}
              >
                {formatRole(user?.role)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                ID: <span className="code-pill code-pill-emp">{displayCode}</span>
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                🏢 {displayDept}
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                {displayDesignation}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#15803d' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span>Authenticated Session</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Username: <strong>{user?.username}</strong>
          </span>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '2rem 0' }}>
          <LoadingSpinner message="Retrieving employee profile from directory..." />
        </div>
      )}

      {/* Main Grid: Three distinct sections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        {/* 1. PERSONAL INFORMATION */}
        <div className="content-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.125rem' }}>👤</span>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Personal Information
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Individual contact & personal data</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Full Legal Name
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                {displayName}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Corporate Email Address
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>
                {displayEmail}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Contact Phone
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                {displayPhone}
              </span>
            </div>

            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
              🔒 <strong>Profile Privacy:</strong> Employees may only view their own profile. Direct access to other personnel records is strictly prohibited by backend authorization.
            </div>
          </div>
        </div>

        {/* 2. EMPLOYMENT INFORMATION */}
        <div className="content-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.125rem' }}>🏢</span>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Employment Information
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Organization, role & assignment details</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Employee ID
              </span>
              <span className="code-pill code-pill-emp" style={{ display: 'inline-block', marginTop: '0.25rem' }}>
                {displayCode}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Assigned Department
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                {displayDept}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Job Title / Designation
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                {displayDesignation}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Date of Joining
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                {displayJoiningDate}
              </span>
            </div>

            {/* Explicit architectural disclosure regarding model fields */}
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
              ℹ️ <em>Reporting Manager &amp; Employment Status:</em> Not currently represented in the existing Employee model.
            </div>
          </div>
        </div>

        {/* 3. ACCOUNT / ACCESS INFORMATION */}
        <div className="content-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.125rem' }}>🔐</span>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Account / Access Information
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Credentials, RBAC & system security</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                System Login Username
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                {user?.username || 'N/A'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Access Role
              </span>
              <div style={{ marginTop: '0.25rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    letterSpacing: '0.05em',
                    ...roleBadgeStyle,
                  }}
                >
                  {formatRole(user?.role)}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Account Status
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: user?.active ? '#15803d' : '#b91c1c',
                  marginTop: '0.125rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: user?.active ? '#22c55e' : '#ef4444',
                  }}
                />
                {user?.active ? 'Active & Enabled' : 'Inactive'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Last Login Session
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
                {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Current Active Session'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Organizational Access Scope
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                {user?.role === 'HR_ADMIN'
                  ? 'Organization-wide Workforce Access'
                  : user?.role === 'MANAGER'
                  ? `Departmental Team Scope (${displayDept})`
                  : `Individual Self-Service Scope (${displayDept})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation / Role-Appropriate Actions */}
      <div className="content-card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
          Role-Appropriate Actions &amp; Navigation
        </h3>

        {/* EMPLOYEE Actions */}
        {user?.role === 'EMPLOYEE' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link to="/apply-leave" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconPlus size={16} />
              <span>Apply for Leave</span>
            </Link>
            <Link to="/leaves" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconLeaves size={16} />
              <span>My Leave Requests</span>
            </Link>
            <Link to="/balances" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconCalendar size={16} />
              <span>My Leave Balances</span>
            </Link>
            <Link to="/availability" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconCalendar size={16} />
              <span>Team Availability</span>
            </Link>
          </div>
        )}

        {/* MANAGER Actions (Personal leave + Manager-only functions) */}
        {user?.role === 'MANAGER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Personal Leave Self-Service (Manager as Employee)
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Link to="/apply-leave" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconPlus size={16} />
                  <span>Apply for Leave</span>
                </Link>
                <Link to="/leaves?scope=mine" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconLeaves size={16} />
                  <span>My Leaves</span>
                </Link>
                <Link to="/balances" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconCalendar size={16} />
                  <span>My Leave Balance</span>
                </Link>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Managerial Team Workspace &amp; Approvals
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Link to="/employees" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconEmployees size={16} />
                  <span>My Department Team</span>
                </Link>
                <Link to="/leaves?scope=approvals" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconClock size={16} />
                  <span>Team Leave Approvals</span>
                </Link>
                <Link to="/availability" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconCalendar size={16} />
                  <span>Team Availability</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* HR_ADMIN Actions */}
        {user?.role === 'HR_ADMIN' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link to="/employees" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconEmployees size={16} />
              <span>Employee Directory</span>
            </Link>
            <Link to="/admin/dashboard" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Workforce Dashboard</span>
            </Link>
            <Link to="/leaves" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconLeaves size={16} />
              <span>All Leave Requests</span>
            </Link>
            <Link to="/balances" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconCalendar size={16} />
              <span>Leave Balances</span>
            </Link>
            <Link to="/departments" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Departments</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
