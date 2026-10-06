import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  leaveApi,
  leaveBalanceApi,
  availabilityApi,
  employeeApi,
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
  IconPlus,
  IconRefresh,
  IconCheckCircle,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconChevronRight,
  IconEmployees,
} from '../components/Icons';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Core Data
  const [leaves, setLeaves] = useState([]);
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [availabilityDate, setAvailabilityDate] = useState(() =>
    new Date().toISOString().substring(0, 10)
  );
  const [availability, setAvailability] = useState(null);

  // Review Modal State
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [employeeBalances, setEmployeeBalances] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      // 1. Fetch team leaves (backend filters by department for MANAGER)
      const leavesPromise = leaveApi.getAll();

      // 2. Fetch team members (backend filters by department for MANAGER)
      const teamPromise = employeeApi.getAll();

      // 3. Fetch team availability for department
      const deptId = user?.departmentId;
      const availPromise = deptId
        ? availabilityApi.getDepartmentAvailability(deptId, availabilityDate)
        : Promise.resolve({ data: null });

      const [leavesRes, teamRes, availRes] = await Promise.all([
        leavesPromise,
        teamPromise,
        availPromise,
      ]);

      setLeaves(leavesRes.data || []);
      setTeamEmployees(teamRes.data || []);
      setAvailability(availRes.data || null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.departmentId, availabilityDate]);

  // Derived KPI & Filter Lists
  const pendingApprovals = useMemo(() => {
    return leaves.filter((l) => (l.status || '').toUpperCase() === 'PENDING');
  }, [leaves]);

  const upcomingTeamLeaves = useMemo(() => {
    return leaves
      .filter((l) => {
        const isApproved = (l.status || '').toUpperCase() === 'APPROVED';
        const isUpcomingOrActive = l.endDate >= todayStr;
        return isApproved && isUpcomingOrActive;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaves, todayStr]);

  const teamSize = teamEmployees.length || availability?.totalEmployees || 0;
  const onLeaveToday = availability?.onLeaveCount || 0;
  const availabilityPct = availability ? Math.round(availability.availabilityPercentage) : 100;

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

  // Execute Approval
  const handleApprove = async () => {
    if (!reviewRequest) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveApi.approve(reviewRequest.id);
      setSuccess(
        `Leave request #${reviewRequest.id} for ${reviewRequest.employee?.name || 'Employee'} has been APPROVED.`
      );
      closeReviewModal();
      fetchDashboardData(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Rejection
  const handleReject = async () => {
    if (!reviewRequest) return;
    if (!rejectionReason.trim()) {
      setError('Please provide a decision/rejection reason before confirming.');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveApi.reject(reviewRequest.id);
      setSuccess(
        `Leave request #${reviewRequest.id} for ${reviewRequest.employee?.name || 'Employee'} has been REJECTED. (Reason logged: ${rejectionReason.trim()})`
      );
      closeReviewModal();
      fetchDashboardData(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} ${diff === 1 ? 'Day' : 'Days'}`;
  };

  if (loading && !leaves.length && !teamEmployees.length) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="lines" count={2} />
        <SkeletonLoader variant="stat-grid" count={4} />
        <SkeletonLoader variant="table" count={5} />
      </div>
    );
  }

  const managerName = user?.employeeName || user?.username || 'Manager';
  const managerDept = user?.departmentName || 'Department';

  return (
    <div className="manager-dashboard space-y-6">
      {/* Personalized Header */}
      <PageHeader
        title={`${getGreeting()}, ${managerName}`}
        subtitle={
          <div className="flex items-center flex-wrap gap-2 text-xs text-secondary mt-1">
            <span className="font-semibold text-primary">Team Approver</span>
            <span>&bull;</span>
            <span className="px-2 py-0.5 rounded font-medium" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {managerDept}
            </span>
            <span>&bull;</span>
            <span className="text-secondary">
              Headcount: <strong className="text-primary">{teamSize}</strong>
            </span>
            <span>&bull;</span>
            <span className="text-secondary">
              On Leave: <strong className="text-primary">{onLeaveToday}</strong>
            </span>
            <span>&bull;</span>
            <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
              Live Availability: {availabilityPct}%
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <Link to="/apply-leave" className="btn btn-primary btn-sm">
              <IconPlus size={15} />
              <span>Apply for Leave</span>
            </Link>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* TOP KPI CARDS - Compact Enterprise SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          unit={pendingApprovals.length === 1 ? "request" : "requests"}
          subtext={pendingApprovals.length > 0 ? "Requires your decision" : "Approval queue is up to date"}
          icon={<IconClock size={16} />}
          tone={pendingApprovals.length > 0 ? "amber" : "slate"}
          badge={pendingApprovals.length > 0 ? "Action Required" : "All Clear"}
          linkTo="#pending-approvals-queue"
          linkText="Review queue"
        />

        <StatCard
          label="Team Availability"
          value={`${availabilityPct}%`}
          subtext={`${availability?.availableCount ?? teamSize} of ${teamSize} active on duty today`}
          icon={<IconCheckCircle size={16} />}
          tone="primary"
          linkTo="#team-availability-section"
          linkText="Capacity details"
        />

        <StatCard
          label="On Leave Today"
          value={onLeaveToday}
          unit={onLeaveToday === 1 ? "staff" : "staff"}
          subtext={onLeaveToday > 0 ? "Approved department absences" : "Full team present on duty"}
          icon={<IconCalendar size={16} />}
          tone={onLeaveToday > 0 ? "amber" : "slate"}
          linkTo="/availability"
          linkText="Department calendar"
        />

        <StatCard
          label="Department Headcount"
          value={teamSize}
          unit="personnel"
          subtext={`Assigned roster in ${managerDept}`}
          icon={<IconEmployees size={16} />}
          tone="purple"
          linkTo="/employees"
          linkText="View roster"
        />
      </div>

      {/* MAIN SECTION 1: PENDING APPROVALS QUEUE */}
      <div id="pending-approvals-queue" className="card-modern">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-semibold text-primary m-0">Pending Approvals Queue</h2>
            <p className="text-xs text-secondary m-0 mt-0.5">
              Time-off submissions from your department requiring review and authorization
            </p>
          </div>
          <span
            className="px-2.5 py-1 text-xs font-semibold rounded font-mono"
            style={{
              background: pendingApprovals.length > 0 ? 'var(--color-warning-light)' : 'var(--color-bg-secondary)',
              color: pendingApprovals.length > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {pendingApprovals.length} Pending Decision{pendingApprovals.length === 1 ? '' : 's'}
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <EmptyState
            title="Approval queue is clear"
            description={`All leave requests for ${managerDept} have been determined. New requests will appear here.`}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Category</th>
                  <th>Dates</th>
                  <th>Duration</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((req) => {
                  const empName = req.employee?.name || 'Staff Member';
                  const empCode = req.employee?.employeeId || 'EMP';

                  return (
                    <tr key={req.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={empName} size="sm" />
                          <div>
                            <span className="font-semibold text-primary text-xs block">{empName}</span>
                            <span className="text-[11px] font-mono text-muted">{empCode}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-medium text-primary text-xs">
                          {req.leaveType?.name || 'Leave'}
                        </span>
                      </td>
                      <td className="text-xs font-mono text-secondary">
                        {req.startDate} &rarr; {req.endDate}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                          {calculateDays(req.startDate, req.endDate)}
                        </span>
                      </td>
                      <td className="text-xs text-muted font-mono">
                        {req.appliedAt ? req.appliedAt.substring(0, 10) : req.startDate}
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openReviewModal(req)}
                          title="Open detailed conflict and balance review"
                        >
                          <span>Review</span>
                          <IconChevronRight size={13} />
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

      {/* TWO COLUMN GRID: TEAM AVAILABILITY & UPCOMING TEAM LEAVES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN SECTION 2: TEAM AVAILABILITY (1 col) */}
        <div id="team-availability-section" className="card-modern">
          <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-semibold text-primary m-0">Team Staffing & Capacity</h2>
            <p className="text-xs text-secondary m-0 mt-0.5">{managerDept} real-time duty status</p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-secondary block mb-1">
                Evaluation Date
              </label>
              <input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="form-control text-xs"
              />
            </div>

            {availability ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-2 border-b text-xs" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Department</span>
                  <span className="font-semibold text-primary">{managerDept}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b text-xs" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Total Headcount</span>
                  <span className="font-bold text-primary font-mono">{teamSize}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b text-xs" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Active on Duty</span>
                  <span className="font-bold font-mono" style={{ color: 'var(--color-success)' }}>
                    {availability.availableCount} / {teamSize}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b text-xs" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">On Approved Leave</span>
                  <span className="font-bold font-mono" style={{ color: 'var(--color-warning)' }}>
                    {availability.onLeaveCount}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-secondary mb-1">
                    <span>Department Capacity</span>
                    <span className="font-semibold text-primary">{availabilityPct}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, availabilityPct)}%`,
                        background:
                          availabilityPct < 70
                            ? 'var(--color-danger)'
                            : availabilityPct < 85
                            ? 'var(--color-warning)'
                            : 'var(--color-success)',
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/availability"
                    className="btn btn-secondary btn-sm w-full justify-center text-xs"
                  >
                    Open Department Roster
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted text-xs">
                Availability data unavailable.
              </div>
            )}
          </div>
        </div>

        {/* MAIN SECTION 3: UPCOMING TEAM LEAVE (2 cols) */}
        <div className="card-modern lg:col-span-2">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-base font-semibold text-primary m-0">Upcoming Team Absences</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">
                Approved leaves scheduled for {managerDept} team members
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {upcomingTeamLeaves.length} Scheduled
            </span>
          </div>

          {upcomingTeamLeaves.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm">
              No upcoming approved leaves on the department schedule.
            </div>
          ) : (
            <div className="table-wrapper-modern">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Category</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTeamLeaves.slice(0, 7).map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={l.employee?.name || 'Staff'} size="sm" />
                          <span className="text-xs font-semibold text-primary">
                            {l.employee?.name || 'Staff'}
                          </span>
                        </div>
                      </td>
                      <td className="text-xs font-medium text-primary">
                        {l.leaveType?.name || 'Leave'}
                      </td>
                      <td className="text-xs font-mono text-secondary">{l.startDate}</td>
                      <td className="text-xs font-mono text-secondary">{l.endDate}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                          {calculateDays(l.startDate, l.endDate)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={l.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* REQUEST REVIEW MODAL / DIALOG */}
      {reviewRequest && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-2xl">
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Leave Request Review #{reviewRequest.id}</h3>
                <p className="modal-subtitle">
                  Verify balance sufficiency, policy rules, and team availability impact before decision.
                </p>
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

            {/* Modal Body */}
            <div className="modal-body space-y-4">
              {reviewLoading ? (
                <div className="py-8">
                  <SkeletonLoader variant="lines" count={4} />
                </div>
              ) : (
                <>
                  {/* 1. Employee Profile Context */}
                  <div className="p-3 rounded-lg flex items-center justify-between border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-3">
                      <Avatar name={reviewRequest.employee?.name || 'Staff'} size="md" />
                      <div>
                        <div className="font-bold text-primary text-sm">
                          {reviewRequest.employee?.name || 'Staff Member'}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          ID: <span className="font-mono font-medium text-secondary">{reviewRequest.employee?.employeeId || 'EMP'}</span> &bull; Dept: <span className="font-medium text-secondary">{reviewRequest.employee?.department?.name || managerDept}</span> &bull; {reviewRequest.employee?.designation || 'Staff'}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status="PENDING" />
                  </div>

                  {/* 2. Leave Request Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-lg border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div>
                      <span className="text-muted block text-[11px]">Leave Category</span>
                      <span className="font-bold text-primary text-xs mt-0.5 block">
                        {reviewRequest.leaveType?.name || 'Standard Leave'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Dates</span>
                      <span className="font-mono font-semibold text-primary mt-0.5 block">
                        {reviewRequest.startDate} &rarr; {reviewRequest.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Effective Deduction</span>
                      <span className="font-bold text-xs mt-0.5 block" style={{ color: 'var(--color-primary)' }}>
                        {conflictData ? `${conflictData.calculatedEffectiveDays} Days` : calculateDays(reviewRequest.startDate, reviewRequest.endDate)}
                      </span>
                      {conflictData && conflictData.holidayCount > 0 && (
                        <span className="text-[10px] text-muted">
                          ({conflictData.holidayCount} holiday excluded)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Submission Date</span>
                      <span className="font-mono text-secondary mt-0.5 block">
                        {reviewRequest.appliedAt ? reviewRequest.appliedAt.substring(0, 10) : reviewRequest.startDate}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  {reviewRequest.reason && (
                    <div className="text-xs p-3 rounded-lg border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                      <span className="font-semibold text-secondary block mb-1">Employee Reason:</span>
                      <p className="text-primary italic m-0">"{reviewRequest.reason}"</p>
                    </div>
                  )}

                  {/* 3. Leave Balance Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                      Employee Quota Allocation
                    </h4>
                    {employeeBalances.length === 0 ? (
                      <div className="text-xs text-muted italic">
                        No active leave quota found for this employee.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        {employeeBalances.map((b) => {
                          const isRelevant = b.leaveType?.id === reviewRequest.leaveType?.id;
                          return (
                            <div
                              key={b.id}
                              className="p-2.5 rounded-lg border"
                              style={{
                                background: isRelevant ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
                                borderColor: isRelevant ? 'var(--color-primary)' : 'var(--color-border)',
                              }}
                            >
                              <div className="font-semibold text-primary truncate flex items-center justify-between">
                                <span>{b.leaveType?.name}</span>
                                {isRelevant && <span className="text-[10px] font-mono px-1 rounded bg-blue-100 text-blue-700">Target</span>}
                              </div>
                              <div className="flex justify-between mt-1 text-[11px] text-secondary font-mono">
                                <span>Entitled: {b.entitlement}d</span>
                                <span>Used: {b.usedDays}d</span>
                              </div>
                              <div className="mt-1 pt-1 border-t flex justify-between font-bold" style={{ borderColor: 'var(--color-border)' }}>
                                <span className="text-secondary text-[11px]">Remaining:</span>
                                <span className="font-mono" style={{ color: b.remainingBalance < 1 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                  {b.remainingBalance} Days
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Conflict Evaluation */}
                  <div>
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                      Compliance & Conflict Assessment
                    </h4>

                    {conflictData ? (
                      <div className="space-y-2">
                        {/* Status Summary Banner */}
                        {conflictData.canApprove ? (
                          <div className="p-3 rounded-lg text-xs flex items-center gap-2 border" style={{ background: 'var(--color-success-light)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                            <IconCheckCircle size={16} className="flex-shrink-0" />
                            <div>
                              <strong>Policy Compliant: Zero Blocking Conflicts</strong> &mdash; Request satisfies annual quota, advance notice rules, and minimum department capacity.
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg text-xs border" style={{ background: 'var(--color-danger-light)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                            <div className="font-bold flex items-center gap-1.5 mb-1">
                              <IconAlertCircle size={15} />
                              <span>Approval Blocked by Backend Rules:</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-0.5">
                              {conflictData.conflicts?.map((c, i) => (
                                <li key={i}>
                                  <strong>[{c.type}]</strong>: {c.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Warnings */}
                        {conflictData.warnings && conflictData.warnings.length > 0 && (
                          <div className="p-2.5 rounded-lg text-xs border" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
                            <span className="font-semibold block">Advisory Warnings:</span>
                            {conflictData.warnings.map((w, idx) => (
                              <div key={idx}>&bull; {w}</div>
                            ))}
                          </div>
                        )}

                        {conflictData.availabilityInfo && (
                          <div className="text-xs text-secondary px-3 py-1.5 rounded border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                            Projected minimum department availability during request window:{' '}
                            <strong className="text-primary font-mono">
                              {conflictData.availabilityInfo.minProjectedAvailabilityPercentage}%
                            </strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        Unable to evaluate conflict status.
                      </div>
                    )}
                  </div>

                  {/* Rejection Note Form (If Rejecting) */}
                  {showRejectConfirm && (
                    <div className="p-3.5 rounded-lg text-xs space-y-2 border" style={{ background: 'var(--color-danger-light)', borderColor: 'var(--color-danger)' }}>
                      <label className="font-semibold block" style={{ color: 'var(--color-danger)' }}>
                        Reason for Rejection <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <textarea
                        className="form-control text-xs w-full"
                        rows="2"
                        placeholder="State why this leave request cannot be approved (e.g., overlapping shift obligations, critical project milestones)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                      ></textarea>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowRejectConfirm(false)}
                          disabled={actionLoading}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={handleReject}
                          disabled={actionLoading || !rejectionReason.trim()}
                        >
                          <IconX size={14} />
                          <span>{actionLoading ? 'Rejecting...' : 'Confirm Rejection'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Actions */}
            {!showRejectConfirm && (
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={closeReviewModal}
                  disabled={actionLoading}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={actionLoading || reviewLoading}
                >
                  <IconX size={15} />
                  <span>Reject Request</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleApprove}
                  disabled={
                    actionLoading ||
                    reviewLoading ||
                    (conflictData && !conflictData.canApprove)
                  }
                  title={
                    conflictData && !conflictData.canApprove
                      ? 'Cannot approve: Policy or capacity conflicts detected by backend'
                      : 'Authorize and approve this leave request'
                  }
                >
                  <IconCheck size={15} />
                  <span>{actionLoading ? 'Authorizing...' : 'Approve Request'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
