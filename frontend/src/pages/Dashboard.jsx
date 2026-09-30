import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { departmentApi, employeeApi, leaveTypeApi, leaveApi, extractErrorMessage } from '../services/api';
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
} from '../components/Icons';

function Dashboard() {
  const [stats, setStats] = useState({
    departments: 0,
    employees: 0,
    leaveTypes: 0,
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    rejectedLeaves: 0,
    cancelledLeaves: 0,
  });
  const [recentLeaves, setRecentLeaves] = useState([]);
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
      const [deptRes, empRes, ltRes, leaveRes] = await Promise.all([
        departmentApi.getAll(),
        employeeApi.getAll(),
        leaveTypeApi.getAll(),
        leaveApi.getAll(),
      ]);

      const leaves = leaveRes.data || [];
      const pending = leaves.filter((l) => l.status === 'PENDING').length;
      const approved = leaves.filter((l) => l.status === 'APPROVED').length;
      const rejected = leaves.filter((l) => l.status === 'REJECTED').length;
      const cancelled = leaves.filter((l) => l.status === 'CANCELLED').length;

      setStats({
        departments: (deptRes.data || []).length,
        employees: (empRes.data || []).length,
        leaveTypes: (ltRes.data || []).length,
        totalLeaves: leaves.length,
        pendingLeaves: pending,
        approvedLeaves: approved,
        rejectedLeaves: rejected,
        cancelledLeaves: cancelled,
      });

      // Sort leaves descending by id for recent applications
      const sorted = [...leaves].sort((a, b) => (b.id || 0) - (a.id || 0));
      setRecentLeaves(sorted.slice(0, 6));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Retrieving real-time workforce metrics..." fullHeight />;
  }

  const approvalRate = stats.totalLeaves > 0
    ? Math.round((stats.approvedLeaves / stats.totalLeaves) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Executive Overview"
        subtitle="Live tracking of organizational headcount, leave balances, and pending managerial decisions"
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <IconRefresh size={16} className={refreshing ? 'icon-spin' : ''} />
              <span>{refreshing ? 'Updating...' : 'Sync Data'}</span>
            </button>
            <Link to="/apply-leave" className="btn btn-primary">
              <IconPlus size={16} />
              <span>New Leave Request</span>
            </Link>
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-card-departments">
          <div className="kpi-glow-orb orb-blue" />
          <div className="kpi-header">
            <span className="kpi-label">Active Departments</span>
            <div className="kpi-icon-badge badge-blue">
              <IconDepartments size={20} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.departments}</span>
            <span className="kpi-subtext">Registered business divisions</span>
          </div>
          <div className="kpi-footer">
            <Link to="/departments" className="kpi-action-link">
              <span>View directory</span>
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="kpi-card kpi-card-employees">
          <div className="kpi-glow-orb orb-indigo" />
          <div className="kpi-header">
            <span className="kpi-label">Total Staff</span>
            <div className="kpi-icon-badge badge-indigo">
              <IconEmployees size={20} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.employees}</span>
            <span className="kpi-subtext">Active team members</span>
          </div>
          <div className="kpi-footer">
            <Link to="/employees" className="kpi-action-link">
              <span>Manage profiles</span>
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="kpi-card kpi-card-leave-types">
          <div className="kpi-glow-orb orb-purple" />
          <div className="kpi-header">
            <span className="kpi-label">Leave Policies</span>
            <div className="kpi-icon-badge badge-purple">
              <IconLeaveTypes size={20} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{stats.leaveTypes}</span>
            <span className="kpi-subtext">Active policy classifications</span>
          </div>
          <div className="kpi-footer">
            <Link to="/leave-types" className="kpi-action-link">
              <span>Policy settings</span>
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="kpi-card kpi-card-pending-action">
          <div className="kpi-glow-orb orb-amber" />
          <div className="kpi-header">
            <span className="kpi-label">Pending Approval</span>
            <div className="kpi-icon-badge badge-amber">
              <IconClock size={20} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-value kpi-value-amber">{stats.pendingLeaves}</span>
            <span className="kpi-subtext">Awaiting managerial review</span>
          </div>
          <div className="kpi-footer">
            <Link to="/leaves" className="kpi-action-link link-amber">
              <span>Review approval queue</span>
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Leave Status Distribution Card */}
      <div className="distribution-card">
        <div className="distribution-header">
          <div>
            <h2 className="section-title">Application Status Distribution</h2>
            <p className="section-subtitle">Real-time outcome breakdown across all filed time-off requests</p>
          </div>
          <div className="distribution-meta-badge">
            Approval Rate: <strong>{approvalRate}%</strong> &bull; Total: <strong>{stats.totalLeaves}</strong>
          </div>
        </div>

        {/* Apple HIG Progress Bar Strip */}
        {stats.totalLeaves > 0 && (
          <div className="distribution-progress-track">
            <div
              className="progress-seg seg-approved"
              style={{ width: `${(stats.approvedLeaves / stats.totalLeaves) * 100}%` }}
              title={`Approved: ${stats.approvedLeaves}`}
            />
            <div
              className="progress-seg seg-pending"
              style={{ width: `${(stats.pendingLeaves / stats.totalLeaves) * 100}%` }}
              title={`Pending: ${stats.pendingLeaves}`}
            />
            <div
              className="progress-seg seg-rejected"
              style={{ width: `${(stats.rejectedLeaves / stats.totalLeaves) * 100}%` }}
              title={`Rejected: ${stats.rejectedLeaves}`}
            />
            <div
              className="progress-seg seg-cancelled"
              style={{ width: `${(stats.cancelledLeaves / stats.totalLeaves) * 100}%` }}
              title={`Cancelled: ${stats.cancelledLeaves}`}
            />
          </div>
        )}

        <div className="distribution-grid">
          <div className="distribution-item status-approved-card">
            <div className="distribution-item-header">
              <span className="dist-indicator indicator-approved" />
              <span className="dist-label">Approved</span>
            </div>
            <div className="dist-count">{stats.approvedLeaves}</div>
            <div className="dist-meta">
              {stats.totalLeaves > 0
                ? `${Math.round((stats.approvedLeaves / stats.totalLeaves) * 100)}% of total`
                : '0%'}
            </div>
          </div>

          <div className="distribution-item status-pending-card">
            <div className="distribution-item-header">
              <span className="dist-indicator indicator-pending" />
              <span className="dist-label">Pending Review</span>
            </div>
            <div className="dist-count">{stats.pendingLeaves}</div>
            <div className="dist-meta">
              {stats.totalLeaves > 0
                ? `${Math.round((stats.pendingLeaves / stats.totalLeaves) * 100)}% of total`
                : '0%'}
            </div>
          </div>

          <div className="distribution-item status-rejected-card">
            <div className="distribution-item-header">
              <span className="dist-indicator indicator-rejected" />
              <span className="dist-label">Rejected</span>
            </div>
            <div className="dist-count">{stats.rejectedLeaves}</div>
            <div className="dist-meta">
              {stats.totalLeaves > 0
                ? `${Math.round((stats.rejectedLeaves / stats.totalLeaves) * 100)}% of total`
                : '0%'}
            </div>
          </div>

          <div className="distribution-item status-cancelled-card">
            <div className="distribution-item-header">
              <span className="dist-indicator indicator-cancelled" />
              <span className="dist-label">Cancelled</span>
            </div>
            <div className="dist-count">{stats.cancelledLeaves}</div>
            <div className="dist-meta">
              {stats.totalLeaves > 0
                ? `${Math.round((stats.cancelledLeaves / stats.totalLeaves) * 100)}% of total`
                : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="content-card mt-6">
        <div className="content-card-header">
          <div>
            <h2 className="section-title">Recent Leave Applications</h2>
            <p className="section-subtitle">Showing latest submissions across all organizational departments</p>
          </div>
          <Link to="/leaves" className="btn btn-outline btn-sm">
            <span>View All Applications</span>
            <IconChevronRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          {recentLeaves.length === 0 ? (
            <div className="empty-inline-state">
              <p>No leave requests logged yet.</p>
              <Link to="/apply-leave" className="btn btn-primary btn-sm mt-2">
                Create First Request
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Ref #</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Policy Type</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentLeaves.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="code-pill">#{l.id}</span>
                    </td>
                    <td>
                      <div className="employee-cell-avatar">
                        <Avatar name={l.employee?.name || 'User'} size={32} />
                        <div className="employee-cell">
                          <span className="employee-name">{l.employee?.name || 'Unknown'}</span>
                          <span className="employee-id">{l.employee?.employeeId || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="dept-tag">
                        {l.employee?.department?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className="policy-badge">{l.leaveType?.name || 'Standard'}</span>
                    </td>
                    <td>
                      <div className="date-range-cell">
                        <IconCalendar size={13} className="text-muted" />
                        <span>{l.startDate} &rarr; {l.endDate}</span>
                      </div>
                    </td>
                    <td>
                      <span className="reason-text" title={l.reason}>
                        {l.reason}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="timestamp-text">
                        {l.appliedAt ? l.appliedAt.substring(0, 10) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
