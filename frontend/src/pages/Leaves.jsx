import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  IconCheckCircle,
  IconAlertCircle,
  IconInfo,
} from '../components/Icons';

function Leaves() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = searchParams.get('scope'); // 'mine' | 'approvals' | null

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Details Modal State
  const [selectedLeave, setSelectedLeave] = useState(null);

  // Manager Decision / Review Panel State
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    leave: null,
    actionType: null, // 'approve' | 'reject' | null
  });
  const [evaluatingConflicts, setEvaluatingConflicts] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  // Cancel Confirmation Modal State
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    leave: null,
  });

  // Handle incoming flash success message from ApplyLeave navigation
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      // Clear state so reload doesn't keep showing it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const calculateDuration = (start, end) => {
    if (!start || !end) return '—';
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} ${diff === 1 ? 'Day' : 'Days'}`;
  };

  const isManager = user?.role === 'MANAGER';
  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isOwnLeave = (leave) => leave.employee?.id === user?.employeeId;

  // Open Manager Review & Decision Modal
  const openReviewModal = async (leave, defaultAction = null) => {
    setReviewModal({
      isOpen: true,
      leave,
      actionType: defaultAction,
    });
    setConflictData(null);
    setEvaluatingConflicts(true);

    try {
      const res = await leaveApi.checkConflicts(leave.id);
      setConflictData(res.data);
    } catch (err) {
      console.error('Error pre-checking leave conflicts:', err);
    } finally {
      setEvaluatingConflicts(false);
    }
  };

  const closeReviewModal = () => {
    if (!actionLoading) {
      setReviewModal({ isOpen: false, leave: null, actionType: null });
      setConflictData(null);
    }
  };

  // Execute Approval or Rejection
  const handleDecision = async (actionType) => {
    const leave = reviewModal.leave;
    if (!leave) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    const empName = leave.employee?.name || 'Employee';

    try {
      if (actionType === 'approve') {
        await leaveApi.approve(leave.id);
        setSuccess(`Leave request #${leave.id} for ${empName} has been APPROVED. Leave balance deducted and recorded in audit log.`);
      } else if (actionType === 'reject') {
        await leaveApi.reject(leave.id);
        setSuccess(`Leave request #${leave.id} for ${empName} has been REJECTED. Balance remains intact and decision recorded in audit log.`);
      }
      closeReviewModal();
      fetchLeaves();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (leave) => {
    setCancelModal({
      isOpen: true,
      leave,
    });
  };

  const closeCancelModal = () => {
    if (!actionLoading) {
      setCancelModal({ isOpen: false, leave: null });
    }
  };

  const handleConfirmCancel = async () => {
    const leave = cancelModal.leave;
    if (!leave) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveApi.cancel(leave.id);
      setSuccess(`Leave request #${leave.id} was successfully cancelled.`);
      closeCancelModal();
      if (selectedLeave?.id === leave.id) {
        setSelectedLeave((prev) => prev ? { ...prev, status: 'CANCELLED' } : null);
      }
      fetchLeaves();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (isManager) {
      if (scope === 'mine' && !isOwnLeave(leave)) return false;
      if (scope === 'approvals' && isOwnLeave(leave)) return false;
    }

    const statusMatch =
      activeFilter === 'ALL' || (leave.status || '').toUpperCase() === activeFilter;

    const term = searchTerm.toLowerCase();
    const searchMatch =
      !searchTerm ||
      (leave.employee?.name || '').toLowerCase().includes(term) ||
      (leave.employee?.employeeCode || leave.employee?.employeeId || '').toLowerCase().includes(term) ||
      (leave.employee?.department?.name || '').toLowerCase().includes(term) ||
      (leave.leaveType?.name || '').toLowerCase().includes(term) ||
      (leave.reason || '').toLowerCase().includes(term) ||
      String(leave.id).includes(term);

    return statusMatch && searchMatch;
  });

  const getHeaderInfo = () => {
    if (user?.role === 'EMPLOYEE') {
      return {
        title: 'My Leave Requests',
        subtitle: 'Track live status of your time-off applications, inspect decision audits, and manage pending bookings',
      };
    }
    if (isManager) {
      if (scope === 'mine') {
        return {
          title: 'My Personal Leave Requests',
          subtitle: 'Your personal time-off applications and status lifecycle history',
        };
      }
      return {
        title: 'Team Leave Approvals',
        subtitle: 'Review department time-off applications, pre-audit schedule conflicts, and execute approval decisions',
      };
    }
    return {
      title: 'Enterprise Leave Requests',
      subtitle: 'Organization-wide leave request tracking, review oversight, and administrative governance',
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="leaves-page">
      <PageHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        badge={`${filteredLeaves.length} Listed`}
        actions={
          <>
            {isManager && (
              <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', marginRight: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSearchParams({ scope: 'approvals' })}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: scope !== 'mine' ? '#ffffff' : 'transparent',
                    color: scope !== 'mine' ? '#0f172a' : '#64748b',
                    boxShadow: scope !== 'mine' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Team Approvals Queue
                </button>
                <button
                  type="button"
                  onClick={() => setSearchParams({ scope: 'mine' })}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: scope === 'mine' ? '#ffffff' : 'transparent',
                    color: scope === 'mine' ? '#0f172a' : '#64748b',
                    boxShadow: scope === 'mine' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  My Requests
                </button>
              </div>
            )}
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
            Showing {filteredLeaves.length} of {leaves.length} records
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
                ? 'The approval queue is currently completely clear.'
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
                  <th>Employee &amp; Department</th>
                  <th>Leave Type</th>
                  <th>Time-Off Window</th>
                  <th>Duration</th>
                  <th>Reason / Context</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: 'center', width: '220px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => {
                  const empName = leave.employee?.name || 'Employee';
                  const isPending = (leave.status || '').toUpperCase() === 'PENDING';
                  const canManage = (isHrAdmin || (isManager && !isOwnLeave(leave))) && isPending;
                  const canCancel = (isHrAdmin || (isManager && isOwnLeave(leave)) || user?.role === 'EMPLOYEE') && isPending;

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
                              <span className="dept-tag-sm">{leave.employee?.department?.name || 'General'}</span>
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
                        <div className="workflow-action-buttons">
                          {/* Details Inspector Button */}
                          <button
                            type="button"
                            className="btn-action-flow btn-secondary"
                            onClick={() => setSelectedLeave(leave)}
                            title="Inspect full details and status timeline"
                            style={{ padding: '3px 8px', fontSize: '11px', background: '#f8fafc' }}
                          >
                            <IconInfo size={13} />
                            <span>Details</span>
                          </button>

                          {/* Manager / Admin Approval Controls */}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="btn-action-flow btn-flow-approve"
                                onClick={() => openReviewModal(leave, 'approve')}
                                disabled={actionLoading}
                                title="Review and approve this leave request"
                              >
                                <IconCheck size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                className="btn-action-flow btn-flow-reject"
                                onClick={() => openReviewModal(leave, 'reject')}
                                disabled={actionLoading}
                                title="Review and reject this leave request"
                              >
                                <IconX size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Employee / Self Cancellation Controls */}
                          {canCancel && (
                            <button
                              type="button"
                              className="btn-action-flow btn-flow-cancel"
                              onClick={() => openCancelModal(leave)}
                              disabled={actionLoading}
                              title="Cancel this pending leave request"
                            >
                              <IconBan size={13} />
                              <span>Cancel</span>
                            </button>
                          )}

                          {!isPending && (
                            <span className="action-finalized-label">Finalized</span>
                          )}
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

      {/* =========================================================================
          1. LEAVE DETAILS & LIFECYCLE TIMELINE MODAL (For Employees & All Roles)
          ========================================================================= */}
      {selectedLeave && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Leave Request #{selectedLeave.id}</h3>
                <p className="modal-subtitle">Comprehensive request parameters &amp; workflow lifecycle state</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedLeave(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                    CURRENT LIFECYCLE STATUS
                  </span>
                  <div style={{ marginTop: '0.25rem' }}>
                    <StatusBadge status={selectedLeave.status} />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                    SUBMITTED ON
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                    {selectedLeave.appliedAt ? new Date(selectedLeave.appliedAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>

              {/* Status Lifecycle Timeline (Section 9) */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.875rem' }}>
                  Workflow Lifecycle Timeline
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Step 1: Submitted */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                        Application Submitted
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Lodge parameters validated and initial audit recorded in system ledger.
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Pending Approval */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: selectedLeave.status === 'PENDING' ? '#f59e0b' : '#10b981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}>
                      {selectedLeave.status === 'PENDING' ? '●' : '✓'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                        Managerial Review
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {selectedLeave.status === 'PENDING'
                          ? 'Awaiting review decision by department manager / authorized approver.'
                          : 'Managerial review phase completed.'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Final State */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: selectedLeave.status === 'APPROVED'
                        ? '#10b981'
                        : selectedLeave.status === 'REJECTED'
                        ? '#ef4444'
                        : selectedLeave.status === 'CANCELLED'
                        ? '#64748b'
                        : '#cbd5e1',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}>
                      {selectedLeave.status === 'PENDING' ? '3' : '✓'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                        {selectedLeave.status === 'APPROVED' && 'Decision: Approved'}
                        {selectedLeave.status === 'REJECTED' && 'Decision: Rejected'}
                        {selectedLeave.status === 'CANCELLED' && 'Status: Cancelled by Applicant'}
                        {selectedLeave.status === 'PENDING' && 'Pending Decision Outcome'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {selectedLeave.status === 'APPROVED' && 'Leave quota deducted and dates reserved on company schedule.'}
                        {selectedLeave.status === 'REJECTED' && 'Application declined. Quota balance untouched and audit entry logged.'}
                        {selectedLeave.status === 'CANCELLED' && 'Booking cancelled by user. Dates released back to team availability.'}
                        {selectedLeave.status === 'PENDING' && 'Outcome will be finalized upon manager decision.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>EMPLOYEE</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                    {selectedLeave.employee?.name}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedLeave.employee?.employeeId} &bull; {selectedLeave.employee?.department?.name || 'General'}
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>LEAVE CATEGORY</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#2563eb' }}>
                    {selectedLeave.leaveType?.name}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedLeave.leaveType?.defaultDays} days standard quota
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>SCHEDULE WINDOW</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                    {selectedLeave.startDate} &rarr; {selectedLeave.endDate}
                  </span>
                </div>

                <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>CALCULATED DURATION</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                    {calculateDuration(selectedLeave.startDate, selectedLeave.endDate)}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  BUSINESS REASON / COVERAGE CONTEXT
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#334155', fontStyle: 'italic' }}>
                  "{selectedLeave.reason || 'No specific notes entered.'}"
                </span>
              </div>
            </div>

            <div className="modal-actions">
              {/* Cancellation button for eligible pending leave */}
              {selectedLeave.status === 'PENDING' && (isHrAdmin || (isManager && isOwnLeave(selectedLeave)) || user?.role === 'EMPLOYEE') && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                  onClick={() => {
                    const l = selectedLeave;
                    setSelectedLeave(null);
                    openCancelModal(l);
                  }}
                >
                  <IconBan size={14} />
                  <span>Cancel Request</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. MANAGER REVIEW & DECISION WORKSPACE MODAL (Section 6 & 7)
          ========================================================================= */}
      {reviewModal.isOpen && reviewModal.leave && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Manager Review: Leave Request #{reviewModal.leave.id}
                </h3>
                <p className="modal-subtitle">
                  Verify balance sufficiency, overlapping schedules &amp; execute managerial decision
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

            <div className="modal-body">
              {/* Applicant Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Avatar name={reviewModal.leave.employee?.name} size="md" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
                      {reviewModal.leave.employee?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      ID: {reviewModal.leave.employee?.employeeId} &bull; Dept: {reviewModal.leave.employee?.department?.name || 'General'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="policy-badge">{reviewModal.leave.leaveType?.name}</span>
                </div>
              </div>

              {/* Time-off Window & Grounds */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>REQUESTED DATES</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                    {reviewModal.leave.startDate} &rarr; {reviewModal.leave.endDate}
                  </span>
                </div>

                <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>WINDOW DURATION</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#2563eb' }}>
                    {calculateDuration(reviewModal.leave.startDate, reviewModal.leave.endDate)}
                  </span>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  EMPLOYEE JUSTIFICATION
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#334155', fontStyle: 'italic' }}>
                  "{reviewModal.leave.reason}"
                </span>
              </div>

              {/* Automated Conflict & Staffing Audit */}
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                  Automated Conflict &amp; Availability Audit
                </span>

                {evaluatingConflicts ? (
                  <div style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', color: '#64748b', textAlign: 'center' }}>
                    <LoadingSpinner message="Auditing leave quotas, official holidays, overlaps & team availability..." />
                  </div>
                ) : conflictData ? (
                  <div>
                    {/* Metrics grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600, display: 'block' }}>CALENDAR</span>
                        <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{conflictData.calculatedTotalDays}d</strong>
                      </div>
                      <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600, display: 'block' }}>HOLIDAYS</span>
                        <strong style={{ fontSize: '0.875rem', color: '#16a34a' }}>{conflictData.holidayCount}d</strong>
                      </div>
                      <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600, display: 'block' }}>DEDUCTED</span>
                        <strong style={{ fontSize: '0.875rem', color: '#2563eb' }}>{conflictData.calculatedEffectiveDays}d</strong>
                      </div>
                      <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600, display: 'block' }}>BALANCE</span>
                        <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{conflictData.remainingBalance}d</strong>
                      </div>
                    </div>

                    {/* Conflict notification */}
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: conflictData.canApprove ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${conflictData.canApprove ? '#bbf7d0' : '#fecaca'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {conflictData.canApprove ? (
                          <IconCheckCircle size={18} className="text-emerald-600" />
                        ) : (
                          <IconAlertCircle size={18} className="text-rose-600" />
                        )}
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: conflictData.canApprove ? '#15803d' : '#b91c1c' }}>
                          {conflictData.canApprove
                            ? 'Zero Blocking Conflicts: Request is approved for clearance'
                            : `Approval Blocked: ${conflictData.conflicts?.length || 0} Conflict(s) Detected`}
                        </span>
                      </div>

                      {conflictData.conflicts && conflictData.conflicts.length > 0 && (
                        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#991b1b' }}>
                          {conflictData.conflicts.map((c, idx) => (
                            <li key={idx}><strong>[{c.type}]</strong> {c.message}</li>
                          ))}
                        </ul>
                      )}

                      {conflictData.warnings && conflictData.warnings.length > 0 && (
                        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#b45309' }}>
                          {conflictData.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
                    Unable to evaluate preliminary conflicts. Backend validation will verify on action.
                  </div>
                )}
              </div>

              {/* Informational note for rejection */}
              <div style={{ padding: '0.625rem 0.875rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>Governance Policy:</span> Approvals automatically deduct effective working days and update ledger. Rejections preserve leave quota intact and record an immutable rejection event.
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeReviewModal}
                disabled={actionLoading}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDecision('reject')}
                  disabled={actionLoading}
                >
                  <IconX size={15} />
                  <span>{actionLoading ? 'Processing...' : 'Reject Request'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleDecision('approve')}
                  disabled={actionLoading || evaluatingConflicts || (conflictData && !conflictData.canApprove)}
                  style={{
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                    color: '#ffffff',
                    opacity: (conflictData && !conflictData.canApprove) ? 0.6 : 1,
                  }}
                >
                  <IconCheck size={15} />
                  <span>{actionLoading ? 'Processing...' : 'Approve Request'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. CANCELLATION CONFIRMATION MODAL
          ========================================================================= */}
      {cancelModal.isOpen && cancelModal.leave && (
        <ConfirmDialog
          isOpen={cancelModal.isOpen}
          title="Cancel Leave Request"
          message={`Are you sure you want to CANCEL leave request #${cancelModal.leave.id} (${cancelModal.leave.startDate} to ${cancelModal.leave.endDate})? This will revoke the booking and release scheduled dates.`}
          confirmText="Yes, Cancel Booking"
          confirmVariant="warning"
          loading={actionLoading}
          onConfirm={handleConfirmCancel}
          onCancel={closeCancelModal}
        />
      )}
    </div>
  );
}

export default Leaves;
