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

  // Prevent authenticated user from viewing login page unnecessarily
  React.useEffect(() => {
    if (isAuthenticated && user?.role) {
      const target = from && from !== '/' && from !== '/login' ? from : getRoleDashboard(user.role);
      navigate(target, { replace: true });
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
      const target = from && from !== '/' && from !== '/login' ? from : getRoleDashboard(userRole);
      navigate(target, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsernameOrEmail(u);
    setPassword(p);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        padding: '2.5rem 2rem'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '0.75rem',
            background: '#4f46e5',
            color: '#ffffff',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', margin: 0 }}>
            LeaveTrack
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.375rem', marginBottom: 0 }}>
            Enterprise Workforce &amp; Leave Management Portal
          </p>
        </div>

        {/* Error Alert */}
        <AlertMessage type="error" message={error} onClose={() => setError('')} />

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="usernameOrEmail" style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '0.375rem'
            }}>
              Username or Email
            </label>
            <input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="e.g. employee or manager@company.com"
              autoComplete="username"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '0.375rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
          </button>
        </form>

        {/* Quick Demo Authentication Profiles */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#94a3b8',
            marginBottom: '0.75rem'
          }}>
            Quick Demo Profiles
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('employee', 'Employee@123')}
              style={{
                fontSize: '0.75rem',
                padding: '0.375rem 0.625rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              👤 Employee
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('manager', 'Manager@123')}
              style={{
                fontSize: '0.75rem',
                padding: '0.375rem 0.625rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              👥 Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'Admin@123')}
              style={{
                fontSize: '0.75rem',
                padding: '0.375rem 0.625rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              🛡️ HR Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
