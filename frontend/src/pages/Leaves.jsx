import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaveApi, extractErrorMessage } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import Avatar from '../components/Avatar';
import {
  IconLeaves,
  IconPlus,
  IconSearch,
  IconCheck,
  IconX,
  IconBan,
  IconRefresh,
  IconCalendar,
} from '../components/Icons';

function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Workflow confirmation dialog state
  const [workflowAction, setWorkflowAction] = useState({
    isOpen: false,
    type: null, // 'approve' | 'reject' | 'cancel'
    leave: null,
  });

  const fetchLeaves = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await leaveApi.getAll();
      setLeaves(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const [evaluatingConflicts, setEvaluatingConflicts] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const openConfirmDialog = async (type, leave) => {
    setWorkflowAction({
      isOpen: true,
      type,
      leave,
    });
    setConflictData(null);

    if (type === 'approve' && leave?.id) {
      setEvaluatingConflicts(true);
      try {
        const res = await leaveApi.checkConflicts(leave.id);
        setConflictData(res.data);
      } catch (err) {
        console.error('Error pre-checking leave conflicts:', err);
      } finally {
        setEvaluatingConflicts(false);
      }
    }
  };

  const closeConfirmDialog = () => {
    if (!actionLoading) {
      setWorkflowAction({ isOpen: false, type: null, leave: null });
      setConflictData(null);
    }
  };

  const handleExecuteWorkflow = async () => {
    const { type, leave } = workflowAction;
    if (!leave || !type) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    const empName = leave.employee?.name || 'Employee';

    try {
      if (type === 'approve') {
        await leaveApi.approve(leave.id);
        setSuccess(`Leave application #${leave.id} for ${empName} was APPROVED successfully!`);
      } else if (type === 'reject') {
        await leaveApi.reject(leave.id);
        setSuccess(`Leave application #${leave.id} for ${empName} was REJECTED.`);
      } else if (type === 'cancel') {
        await leaveApi.cancel(leave.id);
        setSuccess(`Leave application #${leave.id} for ${empName} was CANCELLED.`);
      }
      closeConfirmDialog();
      fetchLeaves();
    } catch (err) {
      setError(extractErrorMessage(err));
      closeConfirmDialog();
    } finally {
      setActionLoading(false);
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '—';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} ${diff === 1 ? 'Day' : 'Days'}`;
  };

  const filteredLeaves = leaves.filter((leave) => {
    const statusMatch =
      activeFilter === 'ALL' || (leave.status || '').toUpperCase() === activeFilter;

    const term = searchTerm.toLowerCase();
    const searchMatch =
      !searchTerm ||
      (leave.employee?.name || '').toLowerCase().includes(term) ||
      (leave.employee?.employeeId || '').toLowerCase().includes(term) ||
      (leave.employee?.department?.name || '').toLowerCase().includes(term) ||
      (leave.leaveType?.name || '').toLowerCase().includes(term) ||
      (leave.reason || '').toLowerCase().includes(term) ||
      String(leave.id).includes(term);

    return statusMatch && searchMatch;
  });

  const getDialogConfig = () => {
    const { type, leave } = workflowAction;
    if (!leave) return {};
    const empName = leave.employee?.name || 'Employee';

    switch (type) {
      case 'approve':
        if (evaluatingConflicts) {
          return {
            title: 'Evaluating Leave Conflicts...',
            message: `Auditing balance, policies, overlapping dates & workforce availability for ${empName}...`,
            confirmText: 'Checking...',
            confirmVariant: 'primary',
          };
        }
        if (conflictData && !conflictData.canApprove) {
          return {
            title: 'Cannot Approve: Policy Conflicts Detected',
            message: `Leave request #${leave.id} for ${empName} cannot be approved due to business policy conflicts.`,
            confirmText: 'Approval Blocked',
            confirmVariant: 'danger',
          };
        }
        return {
          title: 'Approve Leave Request',
          message: `Confirm approval of leave request #${leave.id} for ${empName} (${leave.startDate} to ${leave.endDate})?`,
          confirmText: 'Approve Request',
          confirmVariant: 'success',
        };
      case 'reject':
        return {
          title: 'Reject Leave Request',
          message: `Are you sure you want to mark leave request #${leave.id} for ${empName} as REJECTED? The decision will be logged permanently.`,
          confirmText: 'Reject Request',
          confirmVariant: 'danger',
        };
      case 'cancel':
        return {
          title: 'Cancel Leave Request',
          message: `Are you sure you want to CANCEL leave request #${leave.id} for ${empName}? This will revoke the pending time-off booking.`,
          confirmText: 'Cancel Request',
          confirmVariant: 'warning',
        };
      default:
        return {};
    }
  };

  const dialogConfig = getDialogConfig();

  return (
    <div className="leaves-page">
      <PageHeader
        title="Leave Management & Approval Queue"
        subtitle="Review employee time-off applications, audit requests, and execute managerial status workflows"
        badge={`${leaves.length} Filed`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchLeaves}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
            <Link to="/apply-leave" className="btn btn-primary">
              <IconPlus size={16} />
              <span>Apply for Leave</span>
            </Link>
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Status Filter Tabs */}
      <div className="filter-tabs-bar">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((tab) => {
          const count =
            tab === 'ALL'
              ? leaves.length
              : leaves.filter((l) => (l.status || '').toUpperCase() === tab).length;

          return (
            <button
              key={tab}
              type="button"
              className={`filter-tab-btn ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              <span className="tab-label">{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
              <span className={`tab-badge tab-badge-${tab.toLowerCase()}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search Toolbar & Table Card */}
      <div className="content-card">
        <div className="card-toolbar">
          <div className="search-input-wrapper">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by employee, ID, department, policy, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
          <span className="toolbar-count">
            Showing {filteredLeaves.length} of {leaves.length}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching leave applications and workflow history..." />
        ) : filteredLeaves.length === 0 ? (
          <EmptyState
            icon={<IconLeaves size={36} className="text-muted" />}
            title={
              searchTerm
                ? 'No matching requests'
                : `No ${activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} applications`
            }
            description={
              searchTerm
                ? `No leave requests match your search "${searchTerm}".`
                : activeFilter === 'PENDING'
                ? 'Great job! The managerial approval queue is completely clear.'
                : `No applications currently have status '${activeFilter}'.`
            }
            actionText={leaves.length === 0 ? 'Submit First Application' : null}
            onAction={leaves.length === 0 ? () => window.location.assign('/apply-leave') : null}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Ref #</th>
                  <th>Employee & Department</th>
                  <th>Policy Type</th>
                  <th>Time-Off Window</th>
                  <th>Duration</th>
                  <th>Reason / Grounds</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: '220px' }}>Managerial Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => {
                  const empName = leave.employee?.name || 'Employee';
                  const isPending = (leave.status || '').toUpperCase() === 'PENDING';

                  return (
                    <tr key={leave.id} className={isPending ? 'row-pending-highlight' : ''}>
                      <td>
                        <span className="code-pill">#{leave.id}</span>
                      </td>
                      <td>
                        <div className="employee-cell-avatar">
                          <Avatar name={empName} size={34} />
                          <div className="employee-info-cell">
                            <span className="employee-primary-name">{empName}</span>
                            <div className="cell-subtext-group">
                              <span className="code-pill-sm">{leave.employee?.employeeId || '—'}</span>
                              <span className="dept-tag-sm">{leave.employee?.department?.name || 'No Dept'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="policy-badge">{leave.leaveType?.name || 'Standard'}</span>
                      </td>
                      <td>
                        <div className="date-range-cell">
                          <IconCalendar size={13} className="text-muted" />
                          <span>{leave.startDate} &rarr; {leave.endDate}</span>
                        </div>
                      </td>
                      <td>
                        <span className="duration-pill">
                          {calculateDuration(leave.startDate, leave.endDate)}
                        </span>
                      </td>
                      <td>
                        <span className="reason-text" title={leave.reason}>
                          {leave.reason}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isPending ? (
                          <div className="workflow-action-buttons">
                            <button
                              type="button"
                              className="btn-action-flow btn-flow-approve"
                              onClick={() => openConfirmDialog('approve', leave)}
                              disabled={actionLoading}
                              title="Approve this leave request"
                            >
                              <IconCheck size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-flow btn-flow-reject"
                              onClick={() => openConfirmDialog('reject', leave)}
                              disabled={actionLoading}
                              title="Reject this leave request"
                            >
                              <IconX size={13} />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-flow btn-flow-cancel"
                              onClick={() => openConfirmDialog('cancel', leave)}
                              disabled={actionLoading}
                              title="Cancel this leave request"
                            >
                              <IconBan size={13} />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <span className="action-finalized-label">Decision Finalized</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow Decision Confirmation Modal with Conflict Detection */}
      <ConfirmDialog
        isOpen={workflowAction.isOpen}
        title={dialogConfig.title || 'Confirm Action'}
        message={dialogConfig.message || ''}
        confirmText={dialogConfig.confirmText || 'Confirm'}
        confirmVariant={dialogConfig.confirmVariant || 'primary'}
        loading={actionLoading || evaluatingConflicts}
        confirmDisabled={workflowAction.type === 'approve' && (evaluatingConflicts || (conflictData && !conflictData.canApprove))}
        onConfirm={handleExecuteWorkflow}
        onCancel={closeConfirmDialog}
      >
        {workflowAction.type === 'approve' && (
          <div style={{ marginTop: '0.75rem' }}>
            {evaluatingConflicts && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                <span className="spinner-small" style={{ marginRight: '0.5rem' }}></span>
                Checking leave balance, policy limits, holidays, overlaps & department availability...
              </div>
            )}

            {!evaluatingConflicts && conflictData && (
              <>
                {!conflictData.canApprove ? (
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: '#b91c1c' }}>
                      ⚠️ Approval Blocked: {conflictData.conflicts?.length || 0} Conflict(s) Detected
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {conflictData.conflicts?.map((c, i) => (
                        <li key={i} style={{ marginBottom: '0.3rem' }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginRight: '6px'
                          }}>
                            {c.type}
                          </span>
                          <span>{c.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    color: '#166534',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 600, color: '#15803d', marginBottom: '0.3rem' }}>
                      ✓ Zero Conflicts Detected — Ready for Approval
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#166534', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <span><strong>Total Days:</strong> {conflictData.calculatedTotalDays}</span>
                      <span><strong>Holiday Excluded:</strong> {conflictData.holidayCount}</span>
                      <span><strong>Effective Days:</strong> {conflictData.calculatedEffectiveDays}</span>
                      <span><strong>Current Balance:</strong> {conflictData.remainingBalance} days</span>
                      {conflictData.availabilityInfo && (
                        <span><strong>Min Team Avail:</strong> {conflictData.availabilityInfo.minProjectedAvailabilityPercentage}%</span>
                      )}
                    </div>
                    {conflictData.warnings?.length > 0 && (
                      <div style={{ marginTop: '0.5rem', color: '#854d0e', fontSize: '0.8rem' }}>
                        {conflictData.warnings.map((w, idx) => (
                          <div key={idx}>ℹ️ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default Leaves;
