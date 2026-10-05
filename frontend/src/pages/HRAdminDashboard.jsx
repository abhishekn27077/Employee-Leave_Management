import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  dashboardApi,
  leaveApi,
  leaveBalanceApi,
  extractErrorMessage,
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import {
  IconCalendar,
  IconClock,
  IconRefresh,
  IconCheckCircle,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconLeaves,
  IconEmployees,
  IconDepartments,
} from '../components/Icons';

export default function HRAdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Overview & pending requests data
  const [overview, setOverview] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [availabilityDate, setAvailabilityDate] = useState(() =>
    new Date().toISOString().substring(0, 10)
  );

  // Review Modal State for HR approval oversight
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [employeeBalances, setEmployeeBalances] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [overviewRes, leavesRes] = await Promise.all([
        dashboardApi.getOverview(availabilityDate),
        leaveApi.getAll(),
      ]);

      setOverview(overviewRes.data);
      const allLeaves = leavesRes.data || [];
      const pending = allLeaves.filter(
        (l) => (l.status || '').toUpperCase() === 'PENDING'
      );
      setPendingLeaves(pending);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [availabilityDate]);

  // Map of leaveId -> conflict summary for rapid lookup
  const conflictsMap = useMemo(() => {
    const map = new Map();
    if (overview?.detectedConflicts) {
      overview.detectedConflicts.forEach((c) => {
        map.set(c.leaveId, c);
      });
    }
    return map;
  }, [overview]);

  // Identify low availability departments (< 80%)
  const lowAvailabilityDepts = useMemo(() => {
    if (!overview?.departmentAvailability) return [];
    return overview.departmentAvailability.filter(
      (dept) => dept.totalEmployees > 0 && dept.availabilityPercentage < 80
    );
  }, [overview]);

  // Open Detailed Review Modal
  const openReviewModal = async (leave) => {
    setReviewRequest(leave);
    setReviewLoading(true);
    setConflictData(null);
    setEmployeeBalances([]);
    setRejectionReason('');
    setShowRejectConfirm(false);
    setError('');

    try {
      const [confRes, balRes] = await Promise.all([
        leaveApi.checkConflicts(leave.id),
        leave.employee?.id
          ? leaveBalanceApi.getByEmployee(leave.employee.id)
          : Promise.resolve({ data: [] }),
      ]);
      setConflictData(confRes.data);
      setEmployeeBalances(balRes.data || []);
    } catch (err) {
      console.error('Failed to load review context:', err);
      setError('Could not evaluate conflict details or balance: ' + extractErrorMessage(err));
    } finally {
      setReviewLoading(false);
    }
  };

  const closeReviewModal = () => {
    if (!actionLoading) {
      setReviewRequest(null);
      setConflictData(null);
      setEmployeeBalances([]);
      setRejectionReason('');
      setShowRejectConfirm(false);
    }
  };

  // Handle Approve
  const handleApprove = async () => {
    if (!reviewRequest) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveApi.approve(reviewRequest.id);
      setSuccess(
        `Leave request #${reviewRequest.id} for ${
          reviewRequest.employee?.name || 'Employee'
        } has been APPROVED.`
      );
      closeReviewModal();
      fetchDashboardData(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!reviewRequest) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveApi.reject(reviewRequest.id);
      setSuccess(
        `Leave request #${reviewRequest.id} for ${
          reviewRequest.employee?.name || 'Employee'
        } has been REJECTED.`
      );
      closeReviewModal();
      fetchDashboardData(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="page-container">
        <LoadingSpinner message="Loading workforce administration workspace..." />
      </div>
    );
  }

  const displayName = user?.employeeName || user?.username || 'HR Admin';
  const roleName = 'HR Admin';
  const activeWorkforce =
    (overview?.totalEmployees || 0) - (overview?.totalOnLeaveEmployees || 0);

  return (
    <div className="page-container">
      {/* 1. Header & Identity */}
      <div
        className="hr-dashboard-header"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '1rem',
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.075em',
                  background: 'rgba(216, 180, 254, 0.2)',
                  color: '#e9d5ff',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(216, 180, 254, 0.4)',
                }}
              >
                {roleName} Workspace
              </span>
              {user?.departmentName && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  🏢 {user.departmentName}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
              {getGreeting()}, {displayName}
            </h1>
            <p style={{ color: '#94a3b8', margin: '0.375rem 0 0', fontSize: '0.9375rem' }}>
              Workforce administration &amp; enterprise leave governance center
            </p>
          </div>

          {/* Quick Date Control & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <IconCalendar size={16} className="text-slate-400" />
              <label
                htmlFor="avail-date"
                style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1' }}
              >
                Availability Date:
              </label>
              <input
                id="avail-date"
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
              title="Refresh live metrics"
            >
              <IconRefresh size={14} className={refreshing ? 'spinning' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />}

      {/* 2. Top KPI Cards */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* KPI 1: Total Employees */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
              Total Employees
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <IconEmployees size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {overview?.totalEmployees ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              Across {overview?.totalDepartments ?? 0} departments
            </div>
          </div>
        </div>

        {/* KPI 2: Departments */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #8b5cf6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
              Departments
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6',
              }}
            >
              <IconDepartments size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {overview?.totalDepartments ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              Active business units
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Leave Requests */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: `4px solid ${(overview?.pendingLeaves ?? 0) > 0 ? '#f59e0b' : '#10b981'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
              Pending Requests
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: (overview?.pendingLeaves ?? 0) > 0 ? '#fffbeb' : '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (overview?.pendingLeaves ?? 0) > 0 ? '#f59e0b' : '#10b981',
              }}
            >
              <IconClock size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {overview?.pendingLeaves ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              {(overview?.pendingWithConflictsCount ?? 0) > 0 ? (
                <span style={{ color: '#dc2626', fontWeight: 700 }}>
                  ⚠️ {overview.pendingWithConflictsCount} with conflicts
                </span>
              ) : (
                'Awaiting review / action'
              )}
            </div>
          </div>
        </div>

        {/* KPI 4: Employees on Leave Today */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #ec4899',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
              On Leave Today
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: '#fdf2f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ec4899',
              }}
            >
              <IconLeaves size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {overview?.totalOnLeaveEmployees ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              Out of office on {availabilityDate}
            </div>
          </div>
        </div>

        {/* KPI 5: Team Availability */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #10b981',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
              Team Availability
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <IconCheckCircle size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {overview?.organizationAvailabilityPercentage ?? 100}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              {overview?.totalAvailableEmployees ?? 0} active / {overview?.totalEmployees ?? 0} total
            </div>
          </div>
        </div>

        {/* KPI 6: Leave Utilization */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #6366f1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
              Leave Utilization
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <IconCalendar size={18} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {overview?.utilizationPercentage ?? 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              {overview?.totalUsedDays ?? 0} / {overview?.totalEntitlementDays ?? 0} entitlement days
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section 6: Alerts & Exceptions Panel */}
      {((overview?.detectedConflicts && overview.detectedConflicts.length > 0) ||
        lowAvailabilityDepts.length > 0 ||
        (overview?.pendingLeaves ?? 0) > 0) && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
              }}
            >
              <IconAlertCircle size={18} />
            </div>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
              Operational Alerts &amp; Exceptions
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Condition 1: Leave Conflicts */}
            {overview?.detectedConflicts && overview.detectedConflicts.length > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fed7aa',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', background: '#ffedd5', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>
                    Leave Conflicts ({overview.detectedConflicts.length})
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#4b5563', margin: '0 0 0.5rem' }}>
                  Pending leave requests trigger overlapping team coverage or department threshold conflicts:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {overview.detectedConflicts.map((c) => (
                    <div
                      key={`conf-${c.leaveId}`}
                      style={{
                        fontSize: '0.75rem',
                        color: '#7c2d12',
                        background: '#fff7ed',
                        padding: '0.375rem 0.625rem',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        <strong>{c.employeeName}</strong> ({c.departmentName}) &bull; {c.startDate} to {c.endDate}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const target = pendingLeaves.find((l) => l.id === c.leaveId);
                          if (target) openReviewModal(target);
                        }}
                        style={{
                          background: '#ea580c',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition 2: Low Availability Departments */}
            {lowAvailabilityDepts.length > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>
                    Low Availability Alert ({lowAvailabilityDepts.length})
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#4b5563', margin: '0 0 0.5rem' }}>
                  Departments under minimum availability threshold (&lt;80%) on {availabilityDate}:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {lowAvailabilityDepts.map((d) => (
                    <div
                      key={`low-${d.departmentId}`}
                      style={{
                        fontSize: '0.75rem',
                        color: '#991b1b',
                        background: '#fef2f2',
                        padding: '0.375rem 0.625rem',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        <strong>{d.departmentName}</strong>: {d.onLeaveCount} on leave, {d.availableCount} available
                      </span>
                      <span style={{ fontWeight: 700 }}>{Math.round(d.availabilityPercentage)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition 3: Pending Approvals Oversight */}
            {(overview?.pendingLeaves ?? 0) > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#f1f5f9', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>
                      Pending Approvals Queue
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#4b5563', margin: 0 }}>
                    {overview.pendingLeaves} requests currently await administrative or managerial action.
                  </p>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <Link to="/leaves" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                    Open Leave Registry
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Section 1 Workforce Overview & Section 4 Department Availability */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Section 1: Workforce Overview */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                1. Workforce Overview
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Operational headcount &amp; active workforce distribution
              </p>
            </div>
            <Link to="/employees" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              View Employees
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Employees</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                {overview?.totalEmployees ?? 0}
              </div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Active Workforce</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                {activeWorkforce}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>On Leave Today</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
                {overview?.totalOnLeaveEmployees ?? 0}
              </div>
            </div>
          </div>

          {/* Department Distribution Mini Breakdown */}
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
            Department Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {overview?.departmentAvailability?.map((dept) => {
              const pctOfTotal =
                overview.totalEmployees > 0
                  ? Math.round((dept.totalEmployees / overview.totalEmployees) * 100)
                  : 0;
              return (
                <div key={`dist-${dept.departmentId}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{dept.departmentName}</span>
                    <span style={{ color: '#64748b' }}>
                      {dept.totalEmployees} staff ({pctOfTotal}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      background: '#e2e8f0',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pctOfTotal}%`,
                        backgroundColor: '#3b82f6',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {(!overview?.departmentAvailability || overview.departmentAvailability.length === 0) && (
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                No departments recorded in the system.
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Department Availability */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                4. Department Availability
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Real-time staffing &amp; availability metrics for {availabilityDate}
              </p>
            </div>
            <Link to="/availability" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              Full Matrix
            </Link>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Staff</th>
                  <th style={{ textAlign: 'center' }}>On Leave</th>
                  <th style={{ textAlign: 'center' }}>Available</th>
                  <th style={{ textAlign: 'right' }}>Availability %</th>
                </tr>
              </thead>
              <tbody>
                {overview?.departmentAvailability?.map((dept) => {
                  const availPct = Math.round(dept.availabilityPercentage);
                  const isLow = dept.totalEmployees > 0 && availPct < 80;
                  return (
                    <tr key={`dept-row-${dept.departmentId}`}>
                      <td>
                        <strong>{dept.departmentName}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>{dept.totalEmployees}</td>
                      <td style={{ textAlign: 'center', color: dept.onLeaveCount > 0 ? '#dc2626' : '#64748b' }}>
                        {dept.onLeaveCount}
                      </td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                        {dept.availableCount}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            backgroundColor: isLow ? '#fee2e2' : '#ecfdf5',
                            color: isLow ? '#b91c1c' : '#047857',
                            border: `1px solid ${isLow ? '#fca5a5' : '#a7f3d0'}`,
                          }}
                        >
                          {availPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!overview?.departmentAvailability || overview.departmentAvailability.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                      No availability records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: Pending Leave Requests */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                2. Pending Leave Requests
              </h2>
              {pendingLeaves.length > 0 && (
                <span
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  {pendingLeaves.length} pending
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
              Awaiting manager approval or HR administrative decision
            </p>
          </div>
          <Link to="/leaves" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
            All Requests
          </Link>
        </div>

        {pendingLeaves.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ color: '#10b981', marginBottom: '0.5rem' }}>
              <IconCheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#334155', margin: '0 0 0.25rem' }}>
              No Pending Leave Requests
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
              All employee leave applications across the organization have been processed.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th style={{ textAlign: 'center' }}>Duration</th>
                  <th>Status</th>
                  <th>Conflict Check</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((leave) => {
                  const conflict = conflictsMap.get(leave.id);
                  const hasConflict = conflict && (!conflict.canApprove || (conflict.conflicts && conflict.conflicts.length > 0));
                  return (
                    <tr key={`pending-${leave.id}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Avatar name={leave.employee?.name || 'User'} size="sm" />
                          <div>
                            <strong style={{ color: '#0f172a' }}>{leave.employee?.name || 'Unknown'}</strong>
                            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                              {leave.employee?.employeeCode || `ID #${leave.employee?.id}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#334155' }}>
                          {leave.employee?.department?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: '#1e293b',
                            backgroundColor: '#f1f5f9',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                          }}
                        >
                          {leave.leaveType?.name || 'General Leave'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{leave.startDate}</span>
                          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>to {leave.endDate}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {leave.days ? `${leave.days}d` : '-'}
                      </td>
                      <td>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td>
                        {hasConflict ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: '#dc2626',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                            }}
                          >
                            <IconAlertCircle size={13} />
                            Conflict Detected
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: '#15803d',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                            }}
                          >
                            <IconCheck size={13} />
                            Clear
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openReviewModal(leave)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                        >
                          Review &amp; Decide
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Section 3 Upcoming Leave & Section 5 Recent Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Section 3: Upcoming Leave */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                3. Upcoming Leave
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Approved leaves starting on or after {availabilityDate}
              </p>
            </div>
            <Link to="/leaves" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              View All
            </Link>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th style={{ textAlign: 'center' }}>Days</th>
                </tr>
              </thead>
              <tbody>
                {overview?.upcomingApprovedLeaves?.map((item) => (
                  <tr key={`upcoming-${item.id}`}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{item.employeeName}</strong>
                    </td>
                    <td>
                      <span style={{ color: '#475569' }}>{item.departmentName}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontWeight: 500,
                        }}
                      >
                        {item.leaveTypeName}
                      </span>
                    </td>
                    <td>
                      <span>{item.startDate} &rarr; {item.endDate}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.days}d</td>
                  </tr>
                ))}
                {(!overview?.upcomingApprovedLeaves || overview.upcomingApprovedLeaves.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                      No upcoming approved leaves found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Recent Activity (Audit History) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                5. Recent Activity
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Latest administrative &amp; lifecycle audit log events
              </p>
            </div>
            <Link to="/audit" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              Full Audit Trail
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {overview?.recentActivity?.map((act) => {
              const formattedTime = act.timestamp ? new Date(act.timestamp).toLocaleString() : '-';
              return (
                <div
                  key={`act-${act.id}`}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.6875rem',
                          textTransform: 'uppercase',
                          backgroundColor:
                            act.action === 'CREATE'
                              ? '#dcfce7'
                              : act.action === 'DELETE'
                              ? '#fee2e2'
                              : '#e0e7ff',
                          color:
                            act.action === 'CREATE'
                              ? '#15803d'
                              : act.action === 'DELETE'
                              ? '#b91c1c'
                              : '#4338ca',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                        }}
                      >
                        {act.action}
                      </span>
                      <strong style={{ color: '#0f172a' }}>{act.actor || 'System'}</strong>
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{formattedTime}</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', color: '#334155', lineHeight: 1.35 }}>
                    {act.description}
                  </p>
                </div>
              );
            })}
            {(!overview?.recentActivity || overview.recentActivity.length === 0) && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem', fontStyle: 'italic' }}>
                No recent activity logged.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Oversight Modal */}
      {reviewRequest && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="modal-container"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              padding: '1.75rem',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#7e22ce',
                    background: '#f3e8ff',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                  }}
                >
                  Administrative Review #{reviewRequest.id}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.375rem 0 0', color: '#0f172a' }}>
                  Review Leave Request: {reviewRequest.employee?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={actionLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <IconX size={20} />
              </button>
            </div>

            {reviewLoading ? (
              <div style={{ padding: '2rem 0' }}>
                <LoadingSpinner message="Checking conflicts and employee leave balances..." />
              </div>
            ) : (
              <div>
                {/* Leave details block */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>DEPARTMENT</span>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {reviewRequest.employee?.department?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>LEAVE TYPE</span>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {reviewRequest.leaveType?.name || 'General Leave'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>DATES</span>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {reviewRequest.startDate} &rarr; {reviewRequest.endDate}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>DURATION</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {reviewRequest.days ? `${reviewRequest.days} days` : '-'}
                    </div>
                  </div>
                </div>

                {reviewRequest.reason && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.375rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#475569' }}>EMPLOYEE REASON:</span>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#1e293b' }}>
                      {reviewRequest.reason}
                    </p>
                  </div>
                )}

                {/* Conflict Engine Evaluation Results */}
                {conflictData && (
                  <div
                    style={{
                      marginBottom: '1.25rem',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: conflictData.canApprove ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${conflictData.canApprove ? '#bbf7d0' : '#fecaca'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {conflictData.canApprove ? (
                        <IconCheckCircle size={18} className="text-emerald-600" />
                      ) : (
                        <IconAlertCircle size={18} className="text-rose-600" />
                      )}
                      <strong style={{ color: conflictData.canApprove ? '#15803d' : '#b91c1c', fontSize: '0.875rem' }}>
                        {conflictData.canApprove
                          ? 'Automated Rules Pass — Eligible for Approval'
                          : 'Blocking Conflict Detected — Review Restrictions Below'}
                      </strong>
                    </div>

                    {conflictData.conflicts && conflictData.conflicts.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>Conflicts:</span>
                        <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#7f1d1d' }}>
                          {conflictData.conflicts.map((c, idx) => (
                            <li key={`conf-itm-${idx}`}>
                              <strong>[{c.type}]</strong> {c.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {conflictData.warnings && conflictData.warnings.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>Advisories:</span>
                        <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#92400e' }}>
                          {conflictData.warnings.map((w, idx) => (
                            <li key={`warn-itm-${idx}`}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Balances Context */}
                {employeeBalances.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Employee Balances ({reviewRequest.employee?.name})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                      {employeeBalances.map((b) => (
                        <div
                          key={`bal-${b.id}`}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#334155' }}>{b.leaveType?.name || 'Balance'}</div>
                          <div style={{ color: '#64748b', marginTop: '0.125rem' }}>
                            Remaining: <strong style={{ color: '#0f172a' }}>{b.remainingBalance}d</strong> / {b.entitlement}d
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reject Confirmation section */}
                {showRejectConfirm && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid #fee2e2' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#991b1b' }}>
                      Are you sure you want to REJECT this leave request?
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="btn btn-danger btn-sm"
                      >
                        {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectConfirm(false)}
                        disabled={actionLoading}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Modal Footer Controls */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '1rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={closeReviewModal}
                    disabled={actionLoading}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!showRejectConfirm && (
                      <button
                        type="button"
                        onClick={() => setShowRejectConfirm(true)}
                        disabled={actionLoading}
                        className="btn btn-danger"
                      >
                        Reject Request
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="btn btn-success"
                      style={{
                        backgroundColor: '#16a34a',
                        borderColor: '#15803d',
                        color: '#ffffff',
                      }}
                    >
                      {actionLoading ? 'Approving...' : 'Approve Request'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
