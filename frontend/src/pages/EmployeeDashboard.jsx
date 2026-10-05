import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leaveBalanceApi, leaveApi, availabilityApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import {
  IconCalendar,
  IconClock,
  IconPlus,
  IconRefresh,
  IconCheckCircle,
  IconChevronRight,
  IconLeaves,
} from '../components/Icons';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [teamAvailability, setTeamAvailability] = useState(null);

  // Time-based personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = useMemo(() => {
    return new Date().toISOString().substring(0, 10);
  }, []);

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      // 1. Leave Balances for logged-in employee
      const balancePromise = leaveBalanceApi.getAll();

      // 2. Leave Requests for logged-in employee (backend auto-filters by authenticated employee)
      const leavePromise = leaveApi.getAll();

      // 3. Team Availability for employee's department (if departmentId exists)
      const deptId = user?.departmentId;
      const availabilityPromise = deptId
        ? availabilityApi.getDepartmentAvailability(deptId, todayStr)
        : Promise.resolve({ data: null });

      const [balRes, leaveRes, availRes] = await Promise.all([
        balancePromise,
        leavePromise,
        availabilityPromise,
      ]);

      setBalances(balRes.data || []);
      setLeaves(leaveRes.data || []);
      setTeamAvailability(availRes.data || null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.departmentId, todayStr]);

  // Derived KPI calculations
  const totalAvailable = useMemo(() => {
    return balances.reduce((sum, b) => sum + (Number(b.remainingBalance) || 0), 0);
  }, [balances]);

  const totalUsed = useMemo(() => {
    return balances.reduce((sum, b) => sum + (Number(b.usedDays) || 0), 0);
  }, [balances]);

  const pendingRequestsCount = useMemo(() => {
    return leaves.filter((l) => (l.status || '').toUpperCase() === 'PENDING').length;
  }, [leaves]);

  const upcomingApprovedLeaves = useMemo(() => {
    return leaves
      .filter((l) => {
        const isApproved = (l.status || '').toUpperCase() === 'APPROVED';
        const isUpcomingOrActive = l.endDate >= todayStr;
        return isApproved && isUpcomingOrActive;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaves, todayStr]);

  // Recent leave requests (sorted by appliedAt or id descending, max 5)
  const recentLeaves = useMemo(() => {
    return [...leaves]
      .sort((a, b) => {
        const dateA = a.appliedAt || a.startDate || '';
        const dateB = b.appliedAt || b.startDate || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5);
  }, [leaves]);

  // Leave activity timeline based on real data
  const leaveActivity = useMemo(() => {
    return [...leaves]
      .sort((a, b) => {
        const dateA = a.appliedAt || a.startDate || '';
        const dateB = b.appliedAt || b.startDate || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 6)
      .map((l) => {
        let actionTitle = 'Leave request submitted';
        let actionBadgeClass = 'seg-pending';
        let typeText = 'SUBMITTED';

        const statusUpper = (l.status || '').toUpperCase();
        if (statusUpper === 'APPROVED') {
          actionTitle = `Leave request approved (${l.leaveType?.name || 'Leave'})`;
          actionBadgeClass = 'seg-approved';
          typeText = 'APPROVED';
        } else if (statusUpper === 'REJECTED') {
          actionTitle = `Leave request rejected (${l.leaveType?.name || 'Leave'})`;
          actionBadgeClass = 'seg-rejected';
          typeText = 'REJECTED';
        } else if (statusUpper === 'CANCELLED') {
          actionTitle = `Leave request cancelled (${l.leaveType?.name || 'Leave'})`;
          actionBadgeClass = 'seg-cancelled';
          typeText = 'CANCELLED';
        }

        return {
          id: l.id,
          title: actionTitle,
          status: l.status,
          leaveType: l.leaveType?.name || 'Standard Leave',
          dateRange: `${l.startDate} to ${l.endDate}`,
          appliedAt: l.appliedAt ? new Date(l.appliedAt).toLocaleDateString() : l.startDate,
          typeText,
          actionBadgeClass,
        };
      });
  }, [leaves]);

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} ${diff === 1 ? 'Day' : 'Days'}`;
  };

  if (loading && !balances.length && !leaves.length) {
    return <LoadingSpinner message="Loading your employee portal..." fullHeight />;
  }

  const employeeName = user?.employeeName || user?.username || 'Employee';
  const employeeCode = user?.employeeCode || 'EMP-N/A';
  const departmentName = user?.departmentName || 'General Staff';
  const designation = user?.designation || 'Team Member';

  return (
    <div className="employee-dashboard space-y-6">
      {/* Personalized Header */}
      <PageHeader
        title={`${getGreeting()}, ${employeeName}`}
        subtitle={
          <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">{designation}</span>
            <span>&bull;</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
              ID: {employeeCode}
            </span>
            <span>&bull;</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
              Dept: {departmentName}
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
              <span>{refreshing ? 'Updating...' : 'Sync Data'}</span>
            </button>
            <Link to="/apply-leave" className="btn btn-primary btn-sm">
              <IconPlus size={15} />
              <span>Apply Leave</span>
            </Link>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* TOP KPI CARDS */}
      <div className="kpi-grid">
        {/* 1. Available Leave */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-blue"></div>
          <div className="kpi-header">
            <span className="kpi-label">Available Leave</span>
            <div className="kpi-icon-badge badge-blue">
              <IconCalendar size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalAvailable}</span>
            <span className="kpi-subtext">Remaining days across all quotas</span>
          </div>
          <div className="kpi-footer">
            <Link to="/balances" className="kpi-action-link">
              <span>View Quota Breakdown</span>
              <IconChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* 2. Used Leave */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-indigo"></div>
          <div className="kpi-header">
            <span className="kpi-label">Used Leave</span>
            <div className="kpi-icon-badge badge-indigo">
              <IconLeaves size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalUsed}</span>
            <span className="kpi-subtext">Approved and deducted days this year</span>
          </div>
          <div className="kpi-footer">
            <Link to="/leaves" className="kpi-action-link">
              <span>View Leave History</span>
              <IconChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* 3. Pending Requests */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-amber"></div>
          <div className="kpi-header">
            <span className="kpi-label">Pending Requests</span>
            <div className="kpi-icon-badge badge-amber">
              <IconClock size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className={`kpi-value ${pendingRequestsCount > 0 ? 'kpi-value-amber' : ''}`}>
              {pendingRequestsCount}
            </span>
            <span className="kpi-subtext">Awaiting manager decision</span>
          </div>
          <div className="kpi-footer">
            <Link to="/leaves" className="kpi-action-link link-amber">
              <span>Track Pending Approvals</span>
              <IconChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* 4. Approved Upcoming Leave */}
        <div className="kpi-card">
          <div className="kpi-glow-orb orb-purple"></div>
          <div className="kpi-header">
            <span className="kpi-label">Approved Upcoming</span>
            <div className="kpi-icon-badge badge-purple">
              <IconCheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{upcomingApprovedLeaves.length}</span>
            <span className="kpi-subtext">Approved bookings scheduled ahead</span>
          </div>
          <div className="kpi-footer">
            <a href="#upcoming-leave-section" className="kpi-action-link">
              <span>See Upcoming Schedule</span>
              <IconChevronRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="content-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Quick Actions:</span>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            <Link to="/apply-leave" className="btn btn-primary btn-sm">
              <IconPlus size={14} />
              <span>Apply Leave</span>
            </Link>
            <Link to="/leaves" className="btn btn-secondary btn-sm">
              <IconLeaves size={14} />
              <span>View My Leaves</span>
            </Link>
            <Link to="/balances" className="btn btn-secondary btn-sm">
              <IconCalendar size={14} />
              <span>View Leave Balance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: My Leave Balance + Team Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 1: My Leave Balance (2 columns) */}
        <div className="content-card lg:col-span-2">
          <div className="content-card-header">
            <div>
              <h2 className="section-title">My Leave Balance</h2>
              <p className="section-subtitle">Real-time entitlement, usage, and remaining balance</p>
            </div>
            <Link to="/balances" className="text-xs font-semibold text-primary hover:underline">
              View Detailed Balances &rarr;
            </Link>
          </div>

          {balances.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No leave balances initialized for your profile. Please contact HR to assign policy quotas.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Entitlement</th>
                    <th>Used</th>
                    <th>Remaining</th>
                    <th>Quota Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => {
                    const ent = Number(b.entitlement) || 0;
                    const used = Number(b.usedDays) || 0;
                    const rem = Number(b.remainingBalance) || 0;
                    const pct = ent > 0 ? Math.min(100, Math.round((used / ent) * 100)) : 0;

                    return (
                      <tr key={b.id}>
                        <td>
                          <div className="font-semibold text-gray-800">
                            {b.leaveType?.name || 'General Leave'}
                          </div>
                          {b.leaveType?.description && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {b.leaveType.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="font-medium text-gray-700">{ent} Days</span>
                        </td>
                        <td>
                          <span className="font-medium text-amber-600">{used} Days</span>
                        </td>
                        <td>
                          <span className="font-bold text-emerald-600">{rem} Days</span>
                        </td>
                        <td style={{ minWidth: '150px' }}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 90
                                    ? 'bg-rose-500'
                                    : pct >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-500 tabular-nums w-9 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 6: Team Availability (1 column) */}
        <div className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="section-title">Team Availability</h2>
              <p className="section-subtitle">Department status for today ({todayStr})</p>
            </div>
          </div>

          <div className="p-5">
            {teamAvailability ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500">Department</span>
                  <span className="text-xs font-bold text-gray-800">
                    {teamAvailability.departmentName || departmentName}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500">Available Today</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {teamAvailability.availableCount} / {teamAvailability.totalEmployees}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500">On Leave Today</span>
                  <span className="text-sm font-bold text-amber-600">
                    {teamAvailability.onLeaveCount}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
                    <span>Department Capacity</span>
                    <span className="text-emerald-700">
                      {Math.round(teamAvailability.availabilityPercentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        teamAvailability.availabilityPercentage < 70
                          ? 'bg-rose-500'
                          : teamAvailability.availabilityPercentage < 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, teamAvailability.availabilityPercentage)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/availability"
                    className="btn btn-outline btn-sm w-full justify-center text-xs"
                  >
                    View Department Calendar
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">
                {user?.departmentId
                  ? 'Availability data currently unavailable.'
                  : 'You are not assigned to a department.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Upcoming Approved Leave */}
      <div id="upcoming-leave-section" className="content-card">
        <div className="content-card-header">
          <div>
            <h2 className="section-title">Upcoming Leave</h2>
            <p className="section-subtitle">Your approved time-off scheduled from today onwards</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {upcomingApprovedLeaves.length} Approved Schedule{upcomingApprovedLeaves.length === 1 ? '' : 's'}
          </span>
        </div>

        {upcomingApprovedLeaves.length === 0 ? (
          <div className="p-8 text-center">
            <IconCalendar size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 font-medium">No upcoming approved leave scheduled.</p>
            <p className="text-xs text-gray-400 mt-1">
              Need time off? Click below to lodge a request with your department lead.
            </p>
            <Link to="/apply-leave" className="btn btn-primary btn-sm mt-3 inline-flex">
              <IconPlus size={14} />
              <span>Apply for Leave</span>
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingApprovedLeaves.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="font-semibold text-gray-800">
                        {l.leaveType?.name || 'Leave'}
                      </span>
                    </td>
                    <td>
                      <span className="text-gray-700 font-medium">{l.startDate}</span>
                    </td>
                    <td>
                      <span className="text-gray-700 font-medium">{l.endDate}</span>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                        {calculateDays(l.startDate, l.endDate)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-600 truncate max-w-xs block" title={l.reason}>
                        {l.reason || '—'}
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

      {/* Grid: Recent Requests (Left) + Activity Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 3: Recent Leave Requests */}
        <div className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="section-title">Recent Leave Requests</h2>
              <p className="section-subtitle">Your latest submissions and status updates</p>
            </div>
            <Link to="/leaves" className="text-xs font-semibold text-primary hover:underline">
              View All &rarr;
            </Link>
          </div>

          {recentLeaves.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              You have not submitted any leave requests yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Duration</th>
                    <th>Applied</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaves.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium text-gray-800">
                        {l.leaveType?.name || 'Leave'}
                      </td>
                      <td className="text-xs text-gray-600">
                        {l.startDate} &rarr; {l.endDate}
                      </td>
                      <td className="text-xs text-gray-700 font-medium">
                        {calculateDays(l.startDate, l.endDate)}
                      </td>
                      <td className="text-xs text-gray-500">
                        {l.appliedAt ? l.appliedAt.substring(0, 10) : l.startDate}
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

        {/* SECTION 5: Leave Status / Activity Timeline */}
        <div className="content-card">
          <div className="content-card-header">
            <div>
              <h2 className="section-title">Leave Status & Activity</h2>
              <p className="section-subtitle">Recent lifecycle changes and status transitions</p>
            </div>
          </div>

          <div className="p-5">
            {leaveActivity.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No leave activity recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {leaveActivity.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-start gap-3 text-xs">
                    <div className="mt-1 flex-shrink-0">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-500'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-500'
                            : item.status === 'CANCELLED'
                            ? 'bg-gray-400'
                            : 'bg-amber-500'
                        }`}
                      ></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-800 truncate">
                          {item.title}
                        </span>
                        <span className="text-gray-400 text-[11px] whitespace-nowrap">
                          {item.appliedAt}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        Schedule: <span className="font-medium text-gray-600">{item.dateRange}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
