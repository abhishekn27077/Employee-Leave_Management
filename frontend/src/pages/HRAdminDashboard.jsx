import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  dashboardApi,
  leaveApi,
  leaveBalanceApi,
  extractErrorMessage,
} from '../services/api';
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import {
  IconCalendar,
  IconClock,
  IconRefresh,
  IconCheckCircle,
  IconCheck,
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
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

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
      <div className="space-y-6">
        <SkeletonLoader variant="lines" count={2} />
        <SkeletonLoader variant="stat-grid" count={6} />
        <SkeletonLoader variant="table" count={5} />
      </div>
    );
  }

  const displayName = user?.employeeName || user?.username || 'HR Admin';
  const activeWorkforce =
    (overview?.totalEmployees || 0) - (overview?.totalOnLeaveEmployees || 0);

  return (
    <div className="hr-admin-dashboard space-y-6">
      {/* 1. Header & Identity */}
      <PageHeader
        title={`${getGreeting()}, ${displayName}`}
        subtitle={
          <div className="flex items-center flex-wrap gap-2 text-xs text-secondary mt-1">
            <span className="font-semibold text-primary">Human Resources Administration</span>
            <span>&bull;</span>
            <span className="px-2 py-0.5 rounded font-mono font-medium" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              Executive Workspace
            </span>
            <span>&bull;</span>
            <span>Active Staff: <strong className="text-primary">{activeWorkforce}</strong> / {overview?.totalEmployees ?? 0}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <IconCalendar size={14} className="text-secondary" />
              <label htmlFor="avail-date" className="text-xs font-medium text-secondary">
                Date:
              </label>
              <input
                id="avail-date"
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="bg-transparent border-none text-xs font-mono font-medium text-primary outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              title="Refresh live metrics"
            >
              <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        }
      />

      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />}

      {/* 2. Top KPI Cards - Compact Enterprise SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Headcount"
          value={overview?.totalEmployees ?? 0}
          unit="staff"
          subtext={`Across ${overview?.totalDepartments ?? 0} business units`}
          icon={<IconEmployees size={16} />}
          tone="slate"
          linkTo="/employees"
          linkText="Employee roster"
        />

        <StatCard
          label="Departments"
          value={overview?.totalDepartments ?? 0}
          unit="units"
          subtext="Configured teams"
          icon={<IconDepartments size={16} />}
          tone="slate"
          linkTo="/departments"
          linkText="Manage depts"
        />

        <StatCard
          label="Pending Approvals"
          value={overview?.pendingLeaves ?? 0}
          unit={(overview?.pendingLeaves ?? 0) === 1 ? "request" : "requests"}
          subtext={(overview?.pendingWithConflictsCount ?? 0) > 0 ? `${overview.pendingWithConflictsCount} with conflicts` : 'Awaiting decision'}
          icon={<IconClock size={16} />}
          tone={(overview?.pendingLeaves ?? 0) > 0 ? 'amber' : 'slate'}
          badge={(overview?.pendingWithConflictsCount ?? 0) > 0 ? 'Attention' : undefined}
          linkTo="#pending-requests-section"
          linkText="Review queue"
        />

        <StatCard
          label="On Leave Today"
          value={overview?.totalOnLeaveEmployees ?? 0}
          unit="staff"
          subtext="Active today"
          icon={<IconLeaves size={16} />}
          tone={(overview?.totalOnLeaveEmployees ?? 0) > 0 ? 'amber' : 'slate'}
          linkTo="/availability"
          linkText="Calendar view"
        />

        <StatCard
          label="Org Availability"
          value={`${overview?.organizationAvailabilityPercentage ?? 100}%`}
          subtext={`${overview?.totalAvailableEmployees ?? 0} active on duty`}
          icon={<IconCheckCircle size={16} />}
          tone="primary"
          linkTo="/availability"
          linkText="Staffing matrix"
        />

        <StatCard
          label="Quota Usage"
          value={`${overview?.utilizationPercentage ?? 0}%`}
          subtext={`${overview?.totalUsedDays ?? 0} of ${overview?.totalEntitlementDays ?? 0}d used`}
          icon={<IconCalendar size={16} />}
          tone="purple"
          linkTo="/balances"
          linkText="Quota breakdown"
        />
      </div>

      {/* 3. Operational Alerts & Exceptions Panel */}
      {((overview?.detectedConflicts && overview.detectedConflicts.length > 0) ||
        lowAvailabilityDepts.length > 0 ||
        (overview?.pendingLeaves ?? 0) > 0) && (
        <div className="card-modern p-5" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="flex items-center gap-2 mb-3">
            <IconAlertCircle size={18} style={{ color: 'var(--color-warning)' }} />
            <h2 className="text-sm font-semibold text-primary m-0">
              Operational Alerts & Exceptions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Condition 1: Leave Conflicts */}
            {overview?.detectedConflicts && overview.detectedConflicts.length > 0 && (
              <div className="p-3.5 rounded-lg border text-xs" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <span className="font-semibold px-2 py-0.5 rounded text-[11px] font-mono mb-2 inline-block" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                  Leave Conflicts ({overview.detectedConflicts.length})
                </span>
                <p className="text-secondary m-0 mb-2">
                  Overlapping bookings or department minimum threshold issues detected:
                </p>
                <div className="space-y-1.5">
                  {overview.detectedConflicts.map((c) => (
                    <div
                      key={`conf-${c.leaveId}`}
                      className="p-2 rounded flex justify-between items-center"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      <span className="truncate pr-2">
                        <strong>{c.employeeName}</strong> &bull; {c.departmentName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const target = pendingLeaves.find((l) => l.id === c.leaveId);
                          if (target) openReviewModal(target);
                        }}
                        className="btn btn-secondary btn-sm text-[11px] py-0.5 px-2"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition 2: Low Availability Departments */}
            {lowAvailabilityDepts.length > 0 && (
              <div className="p-3.5 rounded-lg border text-xs" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <span className="font-semibold px-2 py-0.5 rounded text-[11px] font-mono mb-2 inline-block" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                  Low Capacity Alert ({lowAvailabilityDepts.length})
                </span>
                <p className="text-secondary m-0 mb-2">
                  Departments under the 80% staffing threshold on {availabilityDate}:
                </p>
                <div className="space-y-1.5">
                  {lowAvailabilityDepts.map((d) => (
                    <div
                      key={`low-${d.departmentId}`}
                      className="p-2 rounded flex justify-between items-center"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      <span>
                        <strong>{d.departmentName}</strong>: {d.onLeaveCount} absent
                      </span>
                      <span className="font-mono font-bold" style={{ color: 'var(--color-danger)' }}>
                        {Math.round(d.availabilityPercentage)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condition 3: Pending Approvals Oversight */}
            {(overview?.pendingLeaves ?? 0) > 0 && (
              <div className="p-3.5 rounded-lg border text-xs flex flex-col justify-between" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="font-semibold px-2 py-0.5 rounded text-[11px] font-mono mb-2 inline-block" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    Pending Approvals Queue
                  </span>
                  <p className="text-secondary m-0">
                    {overview.pendingLeaves} requests currently await administrative or department manager authorization.
                  </p>
                </div>
                <div className="mt-3">
                  <Link to="/leaves" className="btn btn-secondary btn-sm text-xs w-full justify-center">
                    Open Full Leave Registry
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Section 1 Workforce Overview & Section 4 Department Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Workforce Overview */}
        <div className="card-modern p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary m-0">Workforce Overview</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">Staffing deployment and active duty distribution</p>
            </div>
            <Link to="/employees" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Manage Employees &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-lg border mb-4 text-center" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div>
              <div className="text-[11px] text-secondary font-medium">Total Staff</div>
              <div className="text-xl font-bold text-primary font-mono mt-1">
                {overview?.totalEmployees ?? 0}
              </div>
            </div>
            <div className="border-x" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-[11px] font-medium" style={{ color: 'var(--color-success)' }}>Active Duty</div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--color-success)' }}>
                {activeWorkforce}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium" style={{ color: 'var(--color-warning)' }}>On Leave</div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--color-warning)' }}>
                {overview?.totalOnLeaveEmployees ?? 0}
              </div>
            </div>
          </div>

          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Headcount by Department
          </h3>
          <div className="space-y-2.5">
            {overview?.departmentAvailability?.map((dept) => {
              const pctOfTotal =
                overview.totalEmployees > 0
                  ? Math.round((dept.totalEmployees / overview.totalEmployees) * 100)
                  : 0;
              return (
                <div key={`dist-${dept.departmentId}`} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-primary">{dept.departmentName}</span>
                    <span className="text-secondary font-mono">
                      {dept.totalEmployees} staff ({pctOfTotal}%)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pctOfTotal}%`,
                        background: 'var(--color-primary)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Department Availability */}
        <div className="card-modern p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary m-0">Department Availability Matrix</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">Staffing percentage for {availabilityDate}</p>
            </div>
            <Link to="/availability" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Full Matrix &rarr;
            </Link>
          </div>

          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Staff</th>
                  <th style={{ textAlign: 'center' }}>On Leave</th>
                  <th style={{ textAlign: 'center' }}>Available</th>
                  <th style={{ textAlign: 'right' }}>Availability</th>
                </tr>
              </thead>
              <tbody>
                {overview?.departmentAvailability?.map((dept) => {
                  const availPct = Math.round(dept.availabilityPercentage);
                  const isLow = dept.totalEmployees > 0 && availPct < 80;
                  return (
                    <tr key={`dept-row-${dept.departmentId}`}>
                      <td>
                        <strong className="text-primary font-medium">{dept.departmentName}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono text-secondary">{dept.totalEmployees}</td>
                      <td style={{ textAlign: 'center', color: dept.onLeaveCount > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }} className="font-mono">
                        {dept.onLeaveCount}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--color-success)' }} className="font-mono font-semibold">
                        {dept.availableCount}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className="px-2 py-0.5 rounded font-mono font-semibold text-xs"
                          style={{
                            background: isLow ? 'var(--color-danger-light)' : 'var(--color-success-light)',
                            color: isLow ? 'var(--color-danger)' : 'var(--color-success)',
                            border: `1px solid ${isLow ? 'var(--color-danger)' : 'var(--color-success)'}`,
                          }}
                        >
                          {availPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: Pending Leave Requests */}
      <div id="pending-requests-section" className="card-modern">
        <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-primary m-0">Pending Leave Requests</h2>
              {pendingLeaves.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold font-mono" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                  {pendingLeaves.length} pending
                </span>
              )}
            </div>
            <p className="text-xs text-secondary m-0 mt-0.5">
              Organizational queue for managerial authorization and HR oversight
            </p>
          </div>
          <Link to="/leaves" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
            All Requests &rarr;
          </Link>
        </div>

        {pendingLeaves.length === 0 ? (
          <EmptyState
            title="No pending leave requests"
            description="All employee leave applications across the organization have been reviewed and determined."
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Schedule</th>
                  <th style={{ textAlign: 'center' }}>Duration</th>
                  <th>Status</th>
                  <th>Conflict Pre-Check</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((leave) => {
                  const conflict = conflictsMap.get(leave.id);
                  const hasConflict = conflict && (!conflict.canApprove || (conflict.conflicts && conflict.conflicts.length > 0));
                  return (
                    <tr key={`pending-${leave.id}`}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={leave.employee?.name || 'User'} size="sm" />
                          <div>
                            <strong className="text-primary text-xs block">{leave.employee?.name || 'Unknown'}</strong>
                            <span className="text-[11px] font-mono text-muted">
                              {leave.employee?.employeeCode || `ID #${leave.employee?.id}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-secondary text-xs">
                          {leave.employee?.department?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium text-primary text-xs">
                          {leave.leaveType?.name || 'General Leave'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-secondary">
                          {leave.startDate} &rarr; {leave.endDate}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono font-medium text-xs">
                        {leave.days ? `${leave.days}d` : '-'}
                      </td>
                      <td>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td>
                        {hasConflict ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                            <IconAlertCircle size={12} />
                            Conflict Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                            <IconCheck size={12} />
                            Compliant
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openReviewModal(leave)}
                          className="btn btn-primary btn-sm"
                        >
                          Review & Decide
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Upcoming Leave */}
        <div className="card-modern p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary m-0">Upcoming Approved Leaves</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">Approved bookings starting from {availabilityDate} onwards</p>
            </div>
            <Link to="/leaves" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Full Registry &rarr;
            </Link>
          </div>

          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Schedule</th>
                  <th style={{ textAlign: 'center' }}>Days</th>
                </tr>
              </thead>
              <tbody>
                {overview?.upcomingApprovedLeaves?.slice(0, 6).map((item) => (
                  <tr key={`upcoming-${item.id}`}>
                    <td>
                      <strong className="text-primary text-xs">{item.employeeName}</strong>
                    </td>
                    <td>
                      <span className="text-secondary text-xs">{item.departmentName}</span>
                    </td>
                    <td>
                      <span className="font-medium text-primary text-xs">{item.leaveTypeName}</span>
                    </td>
                    <td className="text-xs font-mono text-secondary">
                      {item.startDate} &rarr; {item.endDate}
                    </td>
                    <td style={{ textAlign: 'center' }} className="font-mono font-medium text-xs">{item.days}d</td>
                  </tr>
                ))}
                {(!overview?.upcomingApprovedLeaves || overview.upcomingApprovedLeaves.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted p-4 text-xs">
                      No upcoming approved leaves found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Recent Activity (Audit History) */}
        <div className="card-modern p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary m-0">System Audit Trail</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">Latest administrative actions & lifecycle events</p>
            </div>
            <Link to="/audit" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Full Audit History &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {overview?.recentActivity?.slice(0, 5).map((act) => {
              const formattedTime = act.timestamp ? new Date(act.timestamp).toLocaleString() : '-';
              return (
                <div
                  key={`act-${act.id}`}
                  className="p-3 rounded-lg border text-xs"
                  style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded uppercase"
                        style={{
                          background:
                            act.action === 'CREATE'
                              ? 'var(--color-success-light)'
                              : act.action === 'DELETE'
                              ? 'var(--color-danger-light)'
                              : 'var(--color-primary-light)',
                          color:
                            act.action === 'CREATE'
                              ? 'var(--color-success)'
                              : act.action === 'DELETE'
                              ? 'var(--color-danger)'
                              : 'var(--color-primary)',
                        }}
                      >
                        {act.action}
                      </span>
                      <strong className="text-primary">{act.actor || 'System'}</strong>
                    </div>
                    <span className="text-muted font-mono text-[11px]">{formattedTime}</span>
                  </div>
                  <p className="text-secondary m-0 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              );
            })}
            {(!overview?.recentActivity || overview.recentActivity.length === 0) && (
              <div className="text-center text-muted p-4 text-xs">
                No recent activity logged.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Oversight Modal */}
      {reviewRequest && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-2xl">
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded uppercase" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  Administrative Review #{reviewRequest.id}
                </span>
                <h3 className="modal-title mt-1">
                  Review Leave Request: {reviewRequest.employee?.name}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeReviewModal}
                disabled={actionLoading}
              >
                &times;
              </button>
            </div>

            {reviewLoading ? (
              <div className="modal-body py-8">
                <SkeletonLoader variant="lines" count={4} />
              </div>
            ) : (
              <div className="modal-body space-y-4">
                {/* Leave details block */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border text-xs" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                  <div>
                    <span className="text-muted text-[11px] font-semibold block">DEPARTMENT</span>
                    <div className="font-semibold text-primary mt-0.5">
                      {reviewRequest.employee?.department?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] font-semibold block">LEAVE CATEGORY</span>
                    <div className="font-semibold text-primary mt-0.5">
                      {reviewRequest.leaveType?.name || 'General Leave'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] font-semibold block">SCHEDULE</span>
                    <div className="font-mono text-secondary mt-0.5">
                      {reviewRequest.startDate} &rarr; {reviewRequest.endDate}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] font-semibold block">DURATION</span>
                    <div className="font-mono font-bold text-primary mt-0.5">
                      {reviewRequest.days ? `${reviewRequest.days} days` : '-'}
                    </div>
                  </div>
                </div>

                {reviewRequest.reason && (
                  <div className="p-3 rounded-lg border text-xs" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <span className="font-semibold text-secondary block mb-1">EMPLOYEE STATED REASON:</span>
                    <p className="text-primary italic m-0">
                      "{reviewRequest.reason}"
                    </p>
                  </div>
                )}

                {/* Conflict Engine Evaluation Results */}
                {conflictData && (
                  <div
                    className="p-3.5 rounded-lg border text-xs"
                    style={{
                      background: conflictData.canApprove ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                      borderColor: conflictData.canApprove ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {conflictData.canApprove ? (
                        <IconCheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <IconAlertCircle size={16} style={{ color: 'var(--color-danger)' }} />
                      )}
                      <strong style={{ color: conflictData.canApprove ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {conflictData.canApprove
                          ? 'Automated Policy Rules Compliant — Ready for Authorization'
                          : 'Blocking Conflict Detected — Review Restrictions Below'}
                      </strong>
                    </div>

                    {conflictData.conflicts && conflictData.conflicts.length > 0 && (
                      <ul className="mt-2 pl-4 list-disc space-y-0.5" style={{ color: 'var(--color-danger)' }}>
                        {conflictData.conflicts.map((c, idx) => (
                          <li key={`conf-itm-${idx}`}>
                            <strong>[{c.type}]</strong> {c.message}
                          </li>
                        ))}
                      </ul>
                    )}

                    {conflictData.warnings && conflictData.warnings.length > 0 && (
                      <ul className="mt-2 pl-4 list-disc space-y-0.5" style={{ color: 'var(--color-warning)' }}>
                        {conflictData.warnings.map((w, idx) => (
                          <li key={`warn-itm-${idx}`}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Balances Context */}
                {employeeBalances.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary uppercase mb-2">
                      Employee Quotas ({reviewRequest.employee?.name})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {employeeBalances.map((b) => (
                        <div
                          key={`bal-${b.id}`}
                          className="p-2.5 rounded-lg border"
                          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                        >
                          <div className="font-semibold text-primary truncate">{b.leaveType?.name || 'Balance'}</div>
                          <div className="text-secondary font-mono mt-0.5">
                            Remaining: <strong className="text-primary">{b.remainingBalance}d</strong> / {b.entitlement}d
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reject Confirmation section */}
                {showRejectConfirm && (
                  <div className="p-3 rounded-lg border text-xs" style={{ background: 'var(--color-danger-light)', borderColor: 'var(--color-danger)' }}>
                    <p className="font-semibold m-0 mb-2" style={{ color: 'var(--color-danger)' }}>
                      Are you sure you want to REJECT this leave request? This action will be recorded in the audit trail.
                    </p>
                    <div className="flex gap-2">
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
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={actionLoading}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>

              <div className="flex gap-2">
                {!showRejectConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={actionLoading}
                    className="btn btn-danger btn-sm"
                  >
                    Reject Request
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {actionLoading ? 'Approving...' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
