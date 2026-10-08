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
    <div className="login-portal-wrapper">
      <div className="login-portal-card">
        {/* Brand & Portal Identity */}
        <div className="login-brand-header">
          <div className="login-brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="login-brand-name">LeaveTrack</div>
          <div className="login-portal-tag">Enterprise Workforce Portal</div>

          <div className="login-welcome-title">Sign In</div>
          <div className="login-welcome-subtitle">
            Enter your credentials to access your leave workspace
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '16px' }}>
            <AlertMessage type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field-group">
            <label htmlFor="usernameOrEmail" className="login-field-label">
              <span>Username or Email</span>
              <span style={{ color: 'var(--danger)' }} aria-hidden="true">*</span>
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
              className="login-input"
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="password" className="login-field-label">
              <span>Password</span>
              <span style={{ color: 'var(--danger)' }} aria-hidden="true">*</span>
            </label>
            <div className="login-password-wrap">
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
                className="login-input"
                style={{ paddingRight: '38px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-toggle-pw"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className="login-submit-btn"
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Demo Role Switcher for Evaluation */}
        <div className="login-demo-panel">
          <div className="login-demo-label">
            <span>Demo Access Profiles</span>
            <span className="login-demo-badge">Sandbox</span>
          </div>

          <div className="login-demo-grid" role="group" aria-label="Demo login profile switcher">
            <button
              type="button"
              className={`login-demo-btn ${activeDemoRole === 'EMPLOYEE' ? 'active' : ''}`}
              onClick={() => handleSelectDemoProfile('EMPLOYEE', 'employee', 'Employee@123')}
            >
              Employee
            </button>
            <button
              type="button"
              className={`login-demo-btn ${activeDemoRole === 'MANAGER' ? 'active' : ''}`}
              onClick={() => handleSelectDemoProfile('MANAGER', 'manager', 'Manager@123')}
            >
              Manager
            </button>
            <button
              type="button"
              className={`login-demo-btn ${activeDemoRole === 'HR_ADMIN' ? 'active' : ''}`}
              onClick={() => handleSelectDemoProfile('HR_ADMIN', 'admin', 'Admin@123')}
            >
              HR Admin
            </button>
          </div>
        </div>
      </div>

      <div className="login-portal-footer">
        LeaveTrack Enterprise HR Portal &bull; Role-Based Access Governance
      </div>
    </div>
  );
}
