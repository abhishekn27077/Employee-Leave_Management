import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  leaveBalanceApi,
  leaveApi,
  availabilityApi,
  extractErrorMessage,
} from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import AlertMessage from '../components/AlertMessage';
import {
  IconCalendar,
  IconLeaves,
  IconClock,
  IconPlus,
  IconRefresh,
  IconChevronRight,
  IconEmployees,
  IconCheck,
  IconX,
  IconBan,
} from '../components/Icons';

function formatHumanDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatActivityTime(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today · ${timeStr}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${timeStr}`;
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · ${timeStr}`;
  } catch {
    return dateStr;
  }
}

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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
      const balancePromise = leaveBalanceApi.getMyBalances();
      const leavesPromise = leaveApi.getMyLeaves();
      const availabilityPromise = user?.departmentId
        ? availabilityApi.getDepartmentAvailability(user.departmentId, todayStr).catch(() => ({ data: null }))
        : Promise.resolve({ data: null });

      const [balanceRes, leavesRes, availRes] = await Promise.all([
        balancePromise,
        leavesPromise,
        availabilityPromise,
      ]);

      setBalances(balanceRes.data || []);
      setLeaves(leavesRes.data || []);
      setAvailability(availRes?.data || null);
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

  // Total balance calculations
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

  // Professional Activity Timeline
  const leaveActivity = useMemo(() => {
    return [...leaves]
      .sort((a, b) => {
        const dateA = a.appliedAt || a.startDate || '';
        const dateB = b.appliedAt || b.startDate || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5)
      .map((l) => {
        const statusUpper = (l.status || '').toUpperCase();
        let icon = <span className="status-dot status-dot-pending" />;
        let statusText = 'Leave submitted';
        let statusTone = 'amber';

        if (statusUpper === 'APPROVED') {
          icon = <IconCheck size={13} className="text-emerald-600" />;
          statusText = 'Leave approved';
          statusTone = 'emerald';
        } else if (statusUpper === 'REJECTED') {
          icon = <IconX size={13} className="text-rose-600" />;
          statusText = 'Leave rejected';
          statusTone = 'rose';
        } else if (statusUpper === 'CANCELLED') {
          icon = <IconBan size={13} className="text-slate-500" />;
          statusText = 'Leave cancelled';
          statusTone = 'slate';
        }

        return {
          id: l.id,
          icon,
          statusText,
          statusTone,
          leaveType: l.leaveType?.name || 'Leave',
          dateRange: `${formatHumanDate(l.startDate)} – ${formatHumanDate(l.endDate)}`,
          timeDisplay: formatActivityTime(l.appliedAt || l.startDate),
          status: l.status,
        };
      });
  }, [leaves]);

  const calculateDays = (start, end) => {
    if (!start || !end) return '1 day';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} ${diff === 1 ? 'day' : 'days'}`;
  };

  const employeeName = user?.employeeName || user?.username || 'Employee';
  const employeeCode = user?.employeeCode || 'EMP-N/A';
  const departmentName = user?.departmentName || 'General Staff';
  const designation = user?.designation || 'Team Member';

  const teamTotalCount = availability?.totalEmployees || 0;
  const teamPresentCount = availability?.presentEmployees?.length || 0;
  const teamAvailabilityRate = availability?.availabilityPercentage ?? (teamTotalCount > 0 ? 100 : 0);

  if (loading && !balances.length && !leaves.length) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="lines" count={2} />
        <SkeletonLoader variant="stat-grid" count={4} />
        <SkeletonLoader variant="table" count={4} />
      </div>
    );
  }

  return (
    <div className="employee-dashboard space-y-5">
      {/* Personalized Header */}
      <PageHeader
        title={`${getGreeting()}, ${employeeName}`}
        subtitle={
          <div className="flex items-center flex-wrap gap-2 text-xs text-secondary mt-0.5">
            <span className="font-semibold text-primary">{designation}</span>
            <span>&bull;</span>
            <span className="px-1.5 py-0.5 rounded font-mono font-medium text-[11px]" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              ID: {employeeCode}
            </span>
            <span>&bull;</span>
            <span className="px-1.5 py-0.5 rounded font-medium text-[11px]" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {departmentName}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
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
              <IconPlus size={14} />
              <span>Apply Leave</span>
            </Link>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* TOP KPI CARDS - Compact Enterprise SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Available Leave"
          value={`${totalAvailable} days`}
          subtext={`${totalUsed} days used this calendar year`}
          icon={<IconCalendar size={16} />}
          tone="primary"
          linkTo="/balances"
          linkText="Quota details"
        />

        <StatCard
          label="Pending Requests"
          value={pendingRequestsCount}
          subtext={pendingRequestsCount > 0 ? "Requires manager decision" : "No pending submissions"}
          icon={<IconClock size={16} />}
          tone={pendingRequestsCount > 0 ? "amber" : "slate"}
          badge={pendingRequestsCount > 0 ? "Action Required" : undefined}
          linkTo="/leaves"
          linkText="Track requests"
        />

        <StatCard
          label="Upcoming Leave"
          value={
            upcomingApprovedLeaves.length > 0
              ? calculateDays(upcomingApprovedLeaves[0].startDate, upcomingApprovedLeaves[0].endDate)
              : "0 days"
          }
          subtext={
            upcomingApprovedLeaves.length > 0
              ? `Starts ${formatHumanDate(upcomingApprovedLeaves[0].startDate)}`
              : "No scheduled absences"
          }
          icon={<IconLeaves size={16} />}
          tone={upcomingApprovedLeaves.length > 0 ? "emerald" : "slate"}
          linkTo="/leaves"
          linkText="Leave calendar"
        />

        <StatCard
          label="Team Availability"
          value={`${teamAvailabilityRate}%`}
          subtext={`${teamPresentCount} of ${teamTotalCount} staff on duty`}
          icon={<IconEmployees size={16} />}
          tone="purple"
          linkTo="/availability"
          linkText="Department view"
        />
      </div>

      {/* Main Grid: My Leave Balance (Left) + Upcoming Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SECTION 1: Leave Quotas & Balances (7 cols) */}
        <div className="card-modern lg:col-span-7">
          <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold text-primary m-0">Leave Quotas & Balances</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">Annual entitlements, usage, and available balances</p>
            </div>
            <Link to="/balances" className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <span>View All</span>
              <IconChevronRight size={12} />
            </Link>
          </div>

          {balances.length === 0 ? (
            <div className="p-6 text-center text-secondary text-xs">
              No leave balances initialized for your profile. Please contact HR to assign policy quotas.
            </div>
          ) : (
            <div className="table-wrapper-modern">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Leave Category</th>
                    <th style={{ textAlign: 'center' }}>Entitled</th>
                    <th style={{ textAlign: 'center' }}>Used</th>
                    <th style={{ textAlign: 'center' }}>Remaining</th>
                    <th style={{ minWidth: 140 }}>Utilization</th>
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
                          <div className="font-semibold text-primary text-xs">
                            {b.leaveType?.name || 'General Leave'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="font-medium text-secondary text-xs">{ent}d</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="font-medium text-xs text-rose-600">{used}d</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="font-semibold text-xs text-emerald-600">{rem}d</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="progress-track flex-1" style={{ height: '5px', margin: 0 }}>
                              <div
                                className={`progress-fill ${pct > 80 ? 'progress-fill-rose' : pct > 50 ? 'progress-fill-amber' : 'progress-fill-blue'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-muted w-7 text-right">{pct}%</span>
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

        {/* SECTION 2: Upcoming Approved Absences & Quick Application Banner (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="card-modern">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-sm font-semibold text-primary m-0">Upcoming Scheduled Leave</h2>
                <p className="text-xs text-secondary m-0 mt-0.5">Approved future bookings</p>
              </div>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                {upcomingApprovedLeaves.length} Booked
              </span>
            </div>

            <div className="p-4">
              {upcomingApprovedLeaves.length === 0 ? (
                <div className="text-center py-5 text-secondary text-xs">
                  <p className="m-0 text-muted">No upcoming leave scheduled.</p>
                  <Link to="/apply-leave" className="inline-block mt-2 text-xs font-semibold text-primary hover:underline">
                    Plan your next time off &rarr;
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingApprovedLeaves.slice(0, 3).map((l) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-lg flex items-center justify-between text-xs"
                      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      <div>
                        <div className="font-semibold text-primary">
                          {l.leaveType?.name || 'Approved Leave'}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          {formatHumanDate(l.startDate)} &ndash; {formatHumanDate(l.endDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-primary">
                          {calculateDays(l.startDate, l.endDate)}
                        </span>
                        <div className="mt-0.5">
                          <StatusBadge status={l.status} />
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

      {/* Grid: Recent Requests (Left) + Activity Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SECTION 3: Recent Leave Requests (7 cols) */}
        <div className="card-modern lg:col-span-7">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="text-sm font-semibold text-primary m-0">Recent Leave Requests</h2>
              <p className="text-xs text-secondary m-0 mt-0.5">Your latest submissions and real-time status</p>
            </div>
            <Link to="/leaves" className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <span>All Requests</span>
              <IconChevronRight size={12} />
            </Link>
          </div>

          {recentLeaves.length === 0 ? (
            <div className="p-6 text-center text-secondary text-xs">
              You have not submitted any leave requests yet.
            </div>
          ) : (
            <div className="table-wrapper-modern">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Schedule</th>
                    <th>Duration</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaves.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium text-primary text-xs">
                        {l.leaveType?.name || 'Leave'}
                      </td>
                      <td className="text-xs text-secondary">
                        {formatHumanDate(l.startDate)} &ndash; {formatHumanDate(l.endDate)}
                      </td>
                      <td className="text-xs text-primary font-medium">
                        {calculateDays(l.startDate, l.endDate)}
                      </td>
                      <td className="text-xs text-muted">
                        {formatHumanDate(l.appliedAt || l.startDate)}
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

        {/* SECTION 4: Professional Activity Timeline (5 cols) */}
        <div className="card-modern lg:col-span-5">
          <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold text-primary m-0">Leave Lifecycle Activity</h2>
            <p className="text-xs text-secondary m-0 mt-0.5">Recent workflow actions and audit milestones</p>
          </div>

          <div className="p-4">
            {leaveActivity.length === 0 ? (
              <div className="text-center py-6 text-muted text-xs">
                No leave activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {leaveActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-xs">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background:
                          item.statusTone === 'emerald'
                            ? '#ecfdf5'
                            : item.statusTone === 'rose'
                            ? '#fef2f2'
                            : item.statusTone === 'slate'
                            ? '#f8fafc'
                            : '#fffbeb',
                        border: `1px solid ${
                          item.statusTone === 'emerald'
                            ? '#a7f3d0'
                            : item.statusTone === 'rose'
                            ? '#fecaca'
                            : item.statusTone === 'slate'
                            ? '#e2e8f0'
                            : '#fde68a'
                        }`,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-primary truncate">
                          {item.statusText}
                        </span>
                        <span className="text-muted text-[11px] whitespace-nowrap">
                          {item.timeDisplay}
                        </span>
                      </div>
                      <div className="text-secondary text-[11px] mt-0.5">
                        <span className="font-medium text-primary">{item.leaveType}</span> &bull; {item.dateRange}
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
