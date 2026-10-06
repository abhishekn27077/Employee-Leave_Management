import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDemoRole, setActiveDemoRole] = useState(null);

  const getRoleDashboard = (role) => {
    switch (role) {
      case 'EMPLOYEE':
        return '/employee/dashboard';
      case 'MANAGER':
        return '/manager/dashboard';
      case 'HR_ADMIN':
        return '/admin/dashboard';
      default:
        return '/employee/dashboard';
    }
  };

  const from = location.state?.from?.pathname;

  const getSafeRedirectTarget = (role) => {
    if (!from || from === '/' || from === '/login' || from.includes('dashboard')) {
      return getRoleDashboard(role);
    }
    const adminOnlyRoutes = [
      '/departments',
      '/leave-types',
      '/leave-policies',
      '/adjustments',
      '/leave-adjustments',
      '/audit',
      '/audit-history',
    ];
    if (adminOnlyRoutes.some((r) => from.startsWith(r)) && role !== 'HR_ADMIN') {
      return getRoleDashboard(role);
    }
    if (from.startsWith('/employees') && role === 'EMPLOYEE') {
      return getRoleDashboard(role);
    }
    return from;
  };

  React.useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getSafeRedirectTarget(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resData = await login(usernameOrEmail.trim(), password);
      const userRole = resData.user?.role;
      navigate(getSafeRedirectTarget(userRole), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoProfile = (role, u, p) => {
    setActiveDemoRole(role);
    setUsernameOrEmail(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="login-split-container">
      {/* Enterprise Left Brand Hero */}
      <div className="login-brand-panel">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                LeaveTrack
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                Enterprise Workforce Portal
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '440px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.03em', color: '#f8fafc', marginBottom: '16px' }}>
              Precision Leave &amp; Workforce Availability Management.
            </h1>
            <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '36px' }}>
              Connect departmental rosters, automated balance tracking, holiday schedules, and approval workflows in one seamless enterprise platform.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0, marginTop: '2px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>Real-Time Conflict Detection</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    Authoritative pre-approval evaluation across 5 operational rules and team capacity thresholds.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0, marginTop: '2px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>Stateless JWT &amp; Role Governance</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    Strict separation between Employee self-service, Manager approvals, and HR Administration.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px', fontSize: '12px', color: '#64748b' }}>
          <span>Enterprise Leave Management System</span>
          <span>Security &bull; Integrity &bull; Audit Trail</span>
        </div>
      </div>

      {/* Right Login Interaction Panel */}
      <div className="login-content-panel">
        <div className="login-form-box">
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Sign In
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
              Enter your credentials to access your workforce portal
            </p>
          </div>

          <AlertMessage type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="usernameOrEmail" className="form-label-modern">
                <span>Username or Email</span>
                <span className="form-label-required" aria-hidden="true">*</span>
              </label>
              <input
                id="usernameOrEmail"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => {
                  setUsernameOrEmail(e.target.value);
                  setActiveDemoRole(null);
                }}
                placeholder="e.g. employee or user@company.com"
                autoComplete="username"
                required
                className="form-input-modern"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label htmlFor="password" className="form-label-modern" style={{ margin: 0 }}>
                  <span>Password</span>
                  <span className="form-label-required" aria-hidden="true">*</span>
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setActiveDemoRole(null);
                  }}
                  placeholder="Enter your account password"
                  autoComplete="current-password"
                  required
                  className="form-input-modern"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading && <LoadingSpinner size="sm" />}
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            </button>
          </form>

          {/* Development Quick-Fill Utility */}
          <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                Quick Demo Profiles
              </span>
              <span style={{ fontSize: '11px', color: '#3b82f6', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                Sandbox
              </span>
            </div>

            <div className="demo-segmented-control" role="tablist" aria-label="Demo login profile switcher">
              <button
                type="button"
                role="tab"
                aria-selected={activeDemoRole === 'EMPLOYEE'}
                className={`demo-segment-btn ${activeDemoRole === 'EMPLOYEE' ? 'active' : ''}`}
                onClick={() => handleSelectDemoProfile('EMPLOYEE', 'employee', 'Employee@123')}
              >
                Employee
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDemoRole === 'MANAGER'}
                className={`demo-segment-btn ${activeDemoRole === 'MANAGER' ? 'active' : ''}`}
                onClick={() => handleSelectDemoProfile('MANAGER', 'manager', 'Manager@123')}
              >
                Manager
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDemoRole === 'HR_ADMIN'}
                className={`demo-segment-btn ${activeDemoRole === 'HR_ADMIN' ? 'active' : ''}`}
                onClick={() => handleSelectDemoProfile('HR_ADMIN', 'admin', 'Admin@123')}
              >
                HR Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
