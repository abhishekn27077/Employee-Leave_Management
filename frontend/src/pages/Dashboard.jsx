import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, extractErrorMessage } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import {
  IconDepartments,
  IconEmployees,
  IconLeaveTypes,
  IconClock,
  IconPlus,
  IconRefresh,
  IconChevronRight,
  IconCalendar,
  IconAlertCircle,
  IconCheckCircle,
  IconInfo,
} from '../components/Icons';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const res = await dashboardApi.getOverview(selectedDate);
      setData(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  if (loading && !data) {
    return <LoadingSpinner message="Retrieving real-time workforce metrics..." fullHeight />;
  }

  const overview = data || {};
  const totalLeaves = overview.totalLeaves || 0;
  const approvedLeaves = overview.approvedLeaves || 0;
  const pendingLeaves = overview.pendingLeaves || 0;
  const rejectedLeaves = overview.rejectedLeaves || 0;
  const cancelledLeaves = overview.cancelledLeaves || 0;
  const approvalRate = overview.approvalRate || 0;

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        title="Workforce Executive Dashboard"
        description="Real-time organizational headcount, live team availability, balance utilization, and conflict monitoring"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs shadow-sm">
              <span className="text-gray-500 font-medium">Availability Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold text-gray-800 focus:outline-none bg-transparent"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <IconRefresh size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <Link
              to="/apply-leave"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <IconPlus size={16} />
              <span>Apply Leave</span>
            </Link>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Top Level KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Staff</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IconEmployees size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">{overview.totalEmployees || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active team members registered</p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <Link to="/employees" className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1">
              <span>View Employee Directory</span>
              <IconChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Departments & Policies */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Divisions & Policies</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <IconDepartments size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">
              {overview.totalDepartments || 0} <span className="text-sm font-normal text-gray-400">/ {overview.totalLeaveTypes || 0} Types</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{overview.totalPolicies || 0} active department policies</p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <Link to="/departments" className="text-purple-600 font-medium hover:underline inline-flex items-center gap-1">
              <span>View Departments</span>
              <IconChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <IconClock size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-600">{overview.pendingLeaves || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting managerial decision</p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <Link to="/leaves" className="text-amber-600 font-medium hover:underline inline-flex items-center gap-1">
              <span>Open Approval Queue</span>
              <IconChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Live Availability */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workforce On Duty</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconCheckCircle size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-600">
              {overview.organizationAvailabilityPercentage != null ? `${overview.organizationAvailabilityPercentage}%` : '100%'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {overview.totalAvailableEmployees || 0} on duty &bull; {overview.totalOnLeaveEmployees || 0} on leave
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <Link to="/availability" className="text-emerald-600 font-medium hover:underline inline-flex items-center gap-1">
              <span>Detailed Availability</span>
              <IconChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Conflict Engine Alert Panel (Phase 8 Integration) */}
      {overview.pendingWithConflictsCount > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 mt-0.5">
              <IconAlertCircle size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-900">
                  {overview.pendingWithConflictsCount} Pending Leave Request(s) Trigger Business Conflicts
                </h3>
                <Link to="/leaves" className="text-xs font-semibold text-amber-800 hover:underline">
                  Resolve in Queue &rarr;
                </Link>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                The Leave Conflict Detection Engine identified balance shortages, overlapping schedules, or department availability thresholds for these pending requests:
              </p>
              <div className="mt-3 space-y-2">
                {overview.detectedConflicts.map((c) => (
                  <div
                    key={c.leaveId}
                    className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-900">
                        Leave #{c.leaveId}: {c.employeeName}
                      </span>{' '}
                      <span className="text-gray-500">
                        ({c.departmentName} &bull; {c.leaveTypeName})
                      </span>
                      <div className="text-gray-500 text-[11px]">
                        Period: {c.startDate} to {c.endDate}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.conflicts.map((detail, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                          title={detail.message}
                        >
                          {detail.type}
                        </span>
                      ))}
                      {!c.canApprove && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          BLOCKING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-800">
          <IconCheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Conflict Engine Clear:</strong> All pending leave requests satisfy policy limits, leave balance quotas, and minimum workforce availability rules.
          </span>
        </div>
      )}

      {/* Workforce Availability & Balance Utilization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Availability Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Department Workforce Availability</h3>
                <p className="text-xs text-gray-500">Live operational staffing ratio on {overview.availabilityDate || selectedDate}</p>
              </div>
              <Link to="/availability" className="text-xs text-indigo-600 font-semibold hover:underline">
                View Roster &rarr;
              </Link>
            </div>

            {(!overview.departmentAvailability || overview.departmentAvailability.length === 0) ? (
              <div className="text-center py-8 text-xs text-gray-400 italic">
                No department records available yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {overview.departmentAvailability.map((dept) => {
                  const pct = dept.availabilityPercentage;
                  const isLow = pct < 70;
                  return (
                    <div key={dept.departmentId} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-800 font-semibold">{dept.departmentName}</span>
                        <span className="text-gray-600">
                          {dept.availableCount} of {dept.totalEmployees} present ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>Overall Availability: <strong className="text-gray-800">{overview.organizationAvailabilityPercentage}%</strong></span>
            <span>Total Absences: <strong className="text-gray-800">{overview.totalOnLeaveEmployees}</strong></span>
          </div>
        </div>

        {/* Leave Balance & Quota Utilization */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Leave Balance & Utilization</h3>
                <p className="text-xs text-gray-500">Aggregated organizational leave bank and consumed days</p>
              </div>
              <Link to="/balances" className="text-xs text-indigo-600 font-semibold hover:underline">
                Balances &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block">Total Entitlement</span>
                <span className="text-xl font-bold text-gray-900">{overview.totalEntitlementDays || 0}</span>
                <span className="text-[11px] text-gray-400 block">days allotted</span>
              </div>
              <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100">
                <span className="text-xs text-indigo-700 block font-medium">Used / Approved</span>
                <span className="text-xl font-bold text-indigo-900">{overview.totalUsedDays || 0}</span>
                <span className="text-[11px] text-indigo-600 block">days taken</span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-xs text-emerald-700 block font-medium">Remaining Bank</span>
                <span className="text-xl font-bold text-emerald-900">{overview.totalRemainingDays || 0}</span>
                <span className="text-[11px] text-emerald-600 block">days available</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-700">
                <span>Annual Leave Consumption Rate</span>
                <span>{overview.utilizationPercentage || 0}% Used</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-indigo-600 h-full rounded-l-full transition-all duration-500"
                  style={{ width: `${overview.utilizationPercentage || 0}%` }}
                />
                <div
                  className="bg-emerald-400 h-full rounded-r-full transition-all duration-500"
                  style={{ width: `${100 - (overview.utilizationPercentage || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
            <Link to="/adjustments" className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1">
              <span>View Balance Adjustments</span>
              <IconChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Application Status Distribution & Upcoming Leaves Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Application Distribution</h3>
                <p className="text-xs text-gray-500">Outcome breakdown across all {totalLeaves} requests</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-800 rounded-lg">
                {approvalRate}% Approved
              </span>
            </div>

            {totalLeaves > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex mb-5">
                <div className="bg-emerald-500 h-full" style={{ width: `${(approvedLeaves / totalLeaves) * 100}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${(pendingLeaves / totalLeaves) * 100}%` }} />
                <div className="bg-rose-500 h-full" style={{ width: `${(rejectedLeaves / totalLeaves) * 100}%` }} />
                <div className="bg-gray-400 h-full" style={{ width: `${(cancelledLeaves / totalLeaves) * 100}%` }} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-700 block">Approved</span>
                <span className="text-xl font-bold text-emerald-900">{approvedLeaves}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-700 block">Pending</span>
                <span className="text-xl font-bold text-amber-900">{pendingLeaves}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                <span className="text-[11px] font-semibold text-rose-700 block">Rejected</span>
                <span className="text-xl font-bold text-rose-900">{rejectedLeaves}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[11px] font-semibold text-gray-600 block">Cancelled</span>
                <span className="text-xl font-bold text-gray-800">{cancelledLeaves}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-50 text-right">
            <Link to="/leaves" className="text-xs text-indigo-600 font-semibold hover:underline">
              View All Leaves &rarr;
            </Link>
          </div>
        </div>

        {/* Upcoming Approved Leaves (2 columns wide) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Upcoming Approved Absences</h3>
                <p className="text-xs text-gray-500">Scheduled staff leaves starting on or after today</p>
              </div>
              <Link to="/leaves" className="text-xs text-indigo-600 font-semibold hover:underline">
                Full Calendar &rarr;
              </Link>
            </div>

            {(!overview.upcomingApprovedLeaves || overview.upcomingApprovedLeaves.length === 0) ? (
              <div className="text-center py-10 text-xs text-gray-400 italic">
                No upcoming approved leaves currently scheduled.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Leave Type</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {overview.upcomingApprovedLeaves.map((up) => (
                      <tr key={up.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {up.employeeName}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {up.departmentName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {up.leaveTypeName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                          {up.startDate} &rarr; {up.endDate}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">
                          {up.days} day{up.days > 1 ? 's' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Leave Activity (Audit Trail) & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Activity */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Recent Audit Trail</h3>
                <p className="text-xs text-gray-500">Chronological activity across leave lifecycle and policies</p>
              </div>
              <Link to="/audit" className="text-xs text-indigo-600 font-semibold hover:underline">
                Full Ledger &rarr;
              </Link>
            </div>

            {(!overview.recentActivity || overview.recentActivity.length === 0) ? (
              <div className="text-center py-8 text-xs text-gray-400 italic">
                No system activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                      {a.actor || 'SYSTEM'}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 flex items-center justify-between">
                        <span>{a.action}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px] truncate max-w-sm" title={a.description}>
                        {a.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Latest Filed Applications */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Latest Applications</h3>
                <p className="text-xs text-gray-500">Most recent requests submitted by team members</p>
              </div>
              <Link to="/leaves" className="text-xs text-indigo-600 font-semibold hover:underline">
                View All &rarr;
              </Link>
            </div>

            {(!overview.recentLeaves || overview.recentLeaves.length === 0) ? (
              <div className="text-center py-8 text-xs text-gray-400 italic">
                No leave requests filed yet.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.recentLeaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={l.employee?.name || 'User'} size={28} />
                      <div>
                        <div className="font-semibold text-gray-900">{l.employee?.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {l.leaveType?.name} &bull; {l.startDate} &rarr; {l.endDate}
                        </div>
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={l.status} />
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
