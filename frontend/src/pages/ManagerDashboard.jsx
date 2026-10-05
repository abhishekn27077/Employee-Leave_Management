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
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
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
    return <LoadingSpinner message="Loading Manager Workspace..." fullHeight />;
  }

  const managerName = user?.employeeName || user?.username || 'Manager';
  const managerDept = user?.departmentName || 'Department';

  return (
    <div className="manager-dashboard space-y-6">
      {/* Personalized Header */}
      <PageHeader
        title={`${getGreeting()}, ${managerName}`}
        subtitle={
          <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">Manager & Approver</span>
            <span>&bull;</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
              Dept: {managerDept}
            </span>
            <span>&bull;</span>
            <span className="text-gray-600">
              Team: <strong>{teamSize}</strong> members
            </span>
            <span>&bull;</span>
            <span className="text-gray-600">
              On Leave Today: <strong>{onLeaveToday}</strong>
            </span>
            <span>&bull;</span>
            <span className="text-emerald-700 font-semibold">
              Live Availability: {availabilityPct}%
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Updating...' : 'Sync Workspace'}</span>
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

      {/* TOP KPI CARDS */}
      <div className="kpi-grid">
        {/* 1. Pending Approvals */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-amber"></div>
          <div className="kpi-header">
            <span className="kpi-label">Pending Approvals</span>
            <div className="kpi-icon-badge badge-amber">
              <IconClock size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className={`kpi-value ${pendingApprovals.length > 0 ? 'kpi-value-amber' : ''}`}>
              {pendingApprovals.length}
            </span>
            <span className="kpi-subtext">Requests awaiting review</span>
          </div>
          <div className="kpi-footer">
            <a href="#pending-approvals-queue" className="kpi-action-link link-amber">
              <span>View Queue Below</span>
              <IconChevronRight size={13} />
            </a>
          </div>
        </div>

        {/* 2. Team Availability */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-blue"></div>
          <div className="kpi-header">
            <span className="kpi-label">Team Availability</span>
            <div className="kpi-icon-badge badge-blue">
              <IconCheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{availabilityPct}%</span>
            <span className="kpi-subtext">
              {availability?.availableCount ?? teamSize} / {teamSize} staff available
            </span>
          </div>
          <div className="kpi-footer">
            <a href="#team-availability-section" className="kpi-action-link">
              <span>Review Capacity Details</span>
              <IconChevronRight size={13} />
            </a>
          </div>
        </div>

        {/* 3. On Leave Today */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-purple"></div>
          <div className="kpi-header">
            <span className="kpi-label">On Leave Today</span>
            <div className="kpi-icon-badge badge-purple">
              <IconCalendar size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{onLeaveToday}</span>
            <span className="kpi-subtext">Active approved leaves today</span>
          </div>
          <div className="kpi-footer">
            <Link to="/availability" className="kpi-action-link">
              <span>View Department Calendar</span>
              <IconChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* 4. Team Size */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-indigo"></div>
          <div className="kpi-header">
            <span className="kpi-label">Team Size</span>
            <div className="kpi-icon-badge badge-indigo">
              <IconEmployees size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{teamSize}</span>
            <span className="kpi-subtext">{managerDept} Headcount</span>
          </div>
          <div className="kpi-footer">
            <Link to="/employees" className="kpi-action-link">
              <span>View Department Team</span>
              <IconChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN SECTION 1: PENDING APPROVALS QUEUE */}
      <div id="pending-approvals-queue" className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="section-title">Pending Approvals Queue</h2>
            <p className="section-subtitle">
              Time-off submissions from your department requiring review and authorization
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {pendingApprovals.length} Pending
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center">
            <IconCheckCircle size={36} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-gray-800">Approval Queue is Clear</p>
            <p className="text-xs text-gray-400 mt-1">
              All leave requests for {managerDept} have been determined.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
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
                    <tr key={req.id} className="row-pending-highlight">
                      <td>
                        <div className="employee-cell-avatar">
                          <Avatar name={empName} size={32} />
                          <div className="employee-info-cell">
                            <span className="employee-primary-name">{empName}</span>
                            <span className="code-pill-sm">{empCode}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-gray-800">
                          {req.leaveType?.name || 'Leave'}
                        </span>
                      </td>
                      <td className="text-xs text-gray-600">
                        {req.startDate} &rarr; {req.endDate}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                          {calculateDays(req.startDate, req.endDate)}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">
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
                          title="Open full conflict and entitlement review"
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
        {/* MAIN SECTION 3: TEAM AVAILABILITY */}
        <div id="team-availability-section" className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="section-title">Team Availability</h2>
              <p className="section-subtitle">{managerDept} capacity</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Date Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Evaluation Date
              </label>
              <input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="w-full text-xs font-semibold text-gray-800 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
              />
            </div>

            {availability ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">Department</span>
                  <span className="font-bold text-gray-800">{managerDept}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">Total Headcount</span>
                  <span className="font-bold text-gray-800">{teamSize}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">Available on Date</span>
                  <span className="font-bold text-emerald-600">
                    {availability.availableCount} / {teamSize}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                  <span className="text-gray-500 font-medium">On Leave on Date</span>
                  <span className="font-bold text-amber-600">
                    {availability.onLeaveCount}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1">
                    <span>Department Capacity</span>
                    <span className="text-emerald-700">{availabilityPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        availabilityPct < 70
                          ? 'bg-rose-500'
                          : availabilityPct < 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, availabilityPct)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/availability"
                    className="btn btn-outline btn-sm w-full justify-center text-xs"
                  >
                    Open Department Roster
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">
                Availability data unavailable.
              </div>
            )}
          </div>
        </div>

        {/* MAIN SECTION 4: UPCOMING TEAM LEAVE */}
        <div className="content-card lg:col-span-2">
          <div className="content-card-header">
            <div>
              <h2 className="section-title">Upcoming Team Leave</h2>
              <p className="section-subtitle">
                Approved leaves scheduled for {managerDept} team members
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {upcomingTeamLeaves.length} Scheduled
            </span>
          </div>

          {upcomingTeamLeaves.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No upcoming approved leaves on the department schedule.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
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
                        <div className="employee-cell-avatar">
                          <Avatar name={l.employee?.name || 'Staff'} size={28} />
                          <span className="employee-primary-name text-xs">
                            {l.employee?.name || 'Staff'}
                          </span>
                        </div>
                      </td>
                      <td className="text-xs font-medium text-gray-800">
                        {l.leaveType?.name || 'Leave'}
                      </td>
                      <td className="text-xs text-gray-600">{l.startDate}</td>
                      <td className="text-xs text-gray-600">{l.endDate}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
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

      {/* MAIN SECTION 2: REQUEST REVIEW MODAL / DIALOG */}
      {reviewRequest && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '680px' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Leave Request Review #{reviewRequest.id}</h3>
                <p className="modal-subtitle">
                  Verify employee balance, policy rules, and real-time team availability conflicts
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
            <div className="modal-body space-y-5">
              {reviewLoading ? (
                <div className="py-8">
                  <LoadingSpinner message="Evaluating leave conflicts and retrieving quota balance..." />
                </div>
              ) : (
                <>
                  {/* 1. Employee Profile Context */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={reviewRequest.employee?.name || 'Staff'} size={38} />
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {reviewRequest.employee?.name || 'Staff Member'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          ID: <span className="font-semibold text-gray-700">{reviewRequest.employee?.employeeId || 'EMP'}</span> &bull; Dept: <span className="font-semibold text-gray-700">{reviewRequest.employee?.department?.name || managerDept}</span> &bull; {reviewRequest.employee?.designation || 'Staff'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">
                      PENDING REVIEW
                    </span>
                  </div>

                  {/* 2. Leave Request Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white border border-gray-200 p-3.5 rounded-lg">
                    <div>
                      <span className="text-gray-400 block font-medium">Leave Category</span>
                      <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                        {reviewRequest.leaveType?.name || 'Standard Leave'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Dates Requested</span>
                      <span className="font-semibold text-gray-800 mt-0.5 block">
                        {reviewRequest.startDate} &rarr; {reviewRequest.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Effective Days</span>
                      <span className="font-bold text-indigo-700 text-sm mt-0.5 block">
                        {conflictData ? conflictData.calculatedEffectiveDays : calculateDays(reviewRequest.startDate, reviewRequest.endDate)}
                      </span>
                      {conflictData && conflictData.holidayCount > 0 && (
                        <span className="text-[11px] text-gray-400">
                          ({conflictData.holidayCount} holiday excluded)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Applied Date</span>
                      <span className="font-semibold text-gray-700 mt-0.5 block">
                        {reviewRequest.appliedAt ? reviewRequest.appliedAt.substring(0, 10) : reviewRequest.startDate}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  {reviewRequest.reason && (
                    <div className="text-xs bg-gray-50 border border-gray-200 p-3 rounded-lg">
                      <span className="font-semibold text-gray-600 block mb-1">Stated Reason:</span>
                      <p className="text-gray-800 italic">{reviewRequest.reason}</p>
                    </div>
                  )}

                  {/* 3. Leave Balance Details */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Employee Quota & Balance
                    </h4>
                    {employeeBalances.length === 0 ? (
                      <div className="text-xs text-gray-400 italic">
                        No active leave quota found for this employee.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        {employeeBalances.map((b) => {
                          const isRelevant = b.leaveType?.id === reviewRequest.leaveType?.id;
                          return (
                            <div
                              key={b.id}
                              className={`p-2.5 rounded-lg border ${
                                isRelevant
                                  ? 'bg-blue-50/60 border-blue-200 ring-1 ring-blue-300'
                                  : 'bg-gray-50 border-gray-200 opacity-75'
                              }`}
                            >
                              <div className="font-semibold text-gray-800 truncate">
                                {b.leaveType?.name} {isRelevant && '⭐'}
                              </div>
                              <div className="flex justify-between mt-1 text-[11px] text-gray-600">
                                <span>Entitled: <strong>{b.entitlement}</strong></span>
                                <span>Used: <strong>{b.usedDays}</strong></span>
                              </div>
                              <div className="mt-1 pt-1 border-t border-gray-200 flex justify-between font-bold">
                                <span>Remaining:</span>
                                <span className={b.remainingBalance < 1 ? 'text-rose-600' : 'text-emerald-700'}>
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
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Conflict & Compliance Engine
                    </h4>

                    {conflictData ? (
                      <div className="space-y-2">
                        {/* Status Summary Banner */}
                        {conflictData.canApprove ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                            <IconCheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                            <div>
                              <strong className="font-semibold">Zero Blocking Conflicts Detected</strong> &mdash; This request satisfies quota, policy rules, and minimum department capacity.
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                            <div className="font-bold flex items-center gap-1.5 text-rose-700 mb-1">
                              <IconAlertCircle size={15} />
                              <span>Approval Blocked by Backend Rules:</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-0.5 text-rose-800">
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
                          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-0.5">
                            <span className="font-semibold block text-amber-900">Advisory Warnings:</span>
                            {conflictData.warnings.map((w, idx) => (
                              <div key={idx}>&bull; {w}</div>
                            ))}
                          </div>
                        )}

                        {/* Capacity Snapshot */}
                        {conflictData.availabilityInfo && (
                          <div className="text-[11.5px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                            Projected minimum department availability during request window:{' '}
                            <strong className="text-gray-800">
                              {conflictData.availabilityInfo.minProjectedAvailabilityPercentage}%
                            </strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Unable to evaluate conflict status.
                      </div>
                    )}
                  </div>

                  {/* Rejection Note Form (If Rejecting) */}
                  {showRejectConfirm && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2">
                      <label className="font-bold text-rose-900 block">
                        Reason for Rejection <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        className="w-full border border-rose-300 rounded p-2 text-xs focus:outline-none focus:border-rose-500 bg-white"
                        rows="2"
                        placeholder="State why this leave request cannot be approved (e.g. overlapping shift obligations, critical project milestones)..."
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
                  className="btn btn-secondary"
                  onClick={closeReviewModal}
                  disabled={actionLoading}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={actionLoading || reviewLoading}
                >
                  <IconX size={15} />
                  <span>Reject Request</span>
                </button>
                <button
                  type="button"
                  className="btn btn-success"
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
                  <span>{actionLoading ? 'Processing...' : 'Approve Request'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
