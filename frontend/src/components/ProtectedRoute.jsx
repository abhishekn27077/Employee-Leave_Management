import React from 'react';
import { Navigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, loading, user, hasRole, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner message="Validating authentication session..." fullHeight />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
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

    const targetDashboard = () => {
      switch (user?.role) {
        case 'HR_ADMIN':
          return '/admin/dashboard';
        case 'MANAGER':
          return '/manager/dashboard';
        case 'EMPLOYEE':
        default:
          return '/employee/dashboard';
      }
    };

    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          border: '1px solid #fee2e2',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.08), 0 8px 10px -6px rgba(239, 68, 68, 0.04)',
          padding: '2.5rem 2rem',
          textAlign: 'center'
        }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1.25rem',
            border: '1px solid #fecaca'
          }}>
            <span>🔒</span>
            <span>HTTP 403 &bull; Access Denied</span>
          </div>

          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em'
          }}>
            Unauthorized Route Access
          </h2>

          <p style={{
            fontSize: '0.875rem',
            color: '#64748b',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}>
            You are signed in as <strong>{user?.employeeName || user?.username}</strong> with role{' '}
            <span style={{
              display: 'inline-block',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontWeight: 600
            }}>
              {formatRole(user?.role)}
            </span>
            . This module requires elevated permissions ({allowedRoles.map(formatRole).join(' or ')}).
          </p>

          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1rem',
            marginBottom: '1.75rem',
            textAlign: 'left',
            fontSize: '0.8125rem',
            color: '#475569'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontWeight: 600 }}>Attempted Route:</span>
              <code style={{ color: '#dc2626', fontWeight: 600 }}>{location.pathname}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Department:</span>
              <span>{user?.departmentName || 'Not Assigned'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to={targetDashboard()} className="btn btn-primary" style={{ padding: '0.625rem 1.25rem' }}>
              Return to My Dashboard
            </Link>
            <button
              type="button"
              onClick={logout}
              className="btn btn-outline"
              style={{ padding: '0.625rem 1.25rem', borderColor: '#cbd5e1', color: '#64748b' }}
            >
              Sign In as Different User
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
