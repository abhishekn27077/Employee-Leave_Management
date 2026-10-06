import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leaveApi, extractErrorMessage } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import {
  IconPlus,
  IconSearch,
  IconCheck,
  IconX,
  IconBan,
  IconRefresh,
  IconInfo,
} from '../components/Icons';

function formatHumanDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

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

    try {
      const res = await leaveApi.checkConflicts(leave.id);
      setConflictData(res.data);
    } catch (err) {
      console.error('Error pre-checking leave conflicts:', err);
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
        setSuccess(`Leave request #${leave.id} for ${empName} has been APPROVED.`);
      } else if (actionType === 'reject') {
        await leaveApi.reject(leave.id);
        setSuccess(`Leave request #${leave.id} for ${empName} has been REJECTED.`);
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
        subtitle: 'Track live status of your time-off applications, inspect decision audits, and manage bookings.',
      };
    }
    if (isManager) {
      if (scope === 'mine') {
        return {
          title: 'My Personal Leave Requests',
          subtitle: 'Your personal time-off applications and status lifecycle history.',
        };
      }
      return {
        title: 'Team Leave Approvals',
        subtitle: 'Review department time-off applications, pre-audit schedule conflicts, and execute decisions.',
      };
    }
    return {
      title: 'Enterprise Leave Registry',
      subtitle: 'Organization-wide leave request tracking, review oversight, and administrative governance.',
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="leaves-page space-y-6">
      <PageHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        badge={`${filteredLeaves.length} Listed`}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {isManager && (
              <div className="inline-flex rounded-lg p-1 border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setSearchParams({ scope: 'approvals' })}
                  className="px-3 py-1 text-xs font-semibold rounded-md border-none cursor-pointer transition-all"
                  style={{
                    background: scope !== 'mine' ? 'var(--color-surface)' : 'transparent',
                    color: scope !== 'mine' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    boxShadow: scope !== 'mine' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  Team Queue
                </button>
                <button
                  type="button"
                  onClick={() => setSearchParams({ scope: 'mine' })}
                  className="px-3 py-1 text-xs font-semibold rounded-md border-none cursor-pointer transition-all"
                  style={{
                    background: scope === 'mine' ? 'var(--color-surface)' : 'transparent',
                    color: scope === 'mine' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    boxShadow: scope === 'mine' ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  My Requests
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchLeaves}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link to="/apply-leave" className="btn btn-primary btn-sm">
              <IconPlus size={14} />
              <span>Apply for Leave</span>
            </Link>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Modern Filter Toolbar Bar */}
      <div className="card-modern p-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((tab) => {
            const count =
              tab === 'ALL'
                ? leaves.length
                : leaves.filter((l) => (l.status || '').toUpperCase() === tab).length;

            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all flex items-center gap-2"
                style={{
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
                onClick={() => setActiveFilter(tab)}
              >
                <span>{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold"
                  style={{
                    background: isActive ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="search-input-wrapper min-w-[260px]">
          <IconSearch size={14} className="search-icon" />
          <input
            type="text"
            className="search-input text-xs"
            placeholder="Search employee, ID, reason..."
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
      </div>

      {/* Main Table Card */}
      <div className="card-modern">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={6} />
          </div>
        ) : filteredLeaves.length === 0 ? (
          <EmptyState
            title={
              searchTerm
                ? 'No matching requests found'
                : `No ${activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} applications`
            }
            description={
              searchTerm
                ? `No leave records match "${searchTerm}". Try a different keyword.`
                : activeFilter === 'PENDING'
                ? 'The approval queue is completely clear.'
                : `No applications currently have status '${activeFilter}'.`
            }
            actionText={leaves.length === 0 ? 'Submit First Application' : undefined}
            actionLink={leaves.length === 0 ? '/apply-leave' : undefined}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ref #</th>
                  <th>Employee & Department</th>
                  <th>Leave Category</th>
                  <th>Dates Requested</th>
                  <th>Duration</th>
                  <th>Reason / Context</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => {
                  const empName = leave.employee?.name || 'Employee';
                  const isPending = (leave.status || '').toUpperCase() === 'PENDING';
                  const canManage = (isHrAdmin || (isManager && !isOwnLeave(leave))) && isPending;
                  const canCancel = (isHrAdmin || (isManager && isOwnLeave(leave)) || user?.role === 'EMPLOYEE') && isPending;

                  return (
                    <tr key={leave.id}>
                      <td>
                        <span className="font-mono text-xs text-muted">#{leave.id}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={empName} size="sm" />
                          <div>
                            <span className="font-semibold text-primary text-xs block">{empName}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted">
                              <span className="font-mono">{leave.employee?.employeeId || '—'}</span>
                              <span>&bull;</span>
                              <span>{leave.employee?.department?.name || 'General'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-primary">
                          {leave.leaveType?.name || 'Standard'}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs text-secondary font-medium">
                          {formatHumanDate(leave.startDate)} &ndash; {formatHumanDate(leave.endDate)}
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                          {calculateDuration(leave.startDate, leave.endDate)}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-secondary truncate max-w-xs block" title={leave.reason}>
                          {leave.reason || '—'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                            onClick={() => setSelectedLeave(leave)}
                            title="Inspect details and timeline"
                          >
                            <IconInfo size={12} />
                            <span>Details</span>
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm text-[11px] py-1 px-2"
                                onClick={() => openReviewModal(leave, 'approve')}
                                disabled={actionLoading}
                                title="Approve"
                              >
                                <IconCheck size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm text-[11px] py-1 px-2"
                                onClick={() => openReviewModal(leave, 'reject')}
                                disabled={actionLoading}
                                title="Reject"
                              >
                                <IconX size={12} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                              onClick={() => openCancelModal(leave)}
                              disabled={actionLoading}
                              title="Cancel request"
                            >
                              <IconBan size={12} />
                              <span>Cancel</span>
                            </button>
                          )}

                          {!isPending && !canManage && (
                            <span className="text-[11px] text-muted font-mono">Finalized</span>
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

      {/* LEAVE DETAILS MODAL */}
      {selectedLeave && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Leave Request #{selectedLeave.id}</h3>
                <p className="modal-subtitle">Full parameters and lifecycle record</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedLeave(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="text-[11px] text-muted font-semibold block">CURRENT STATUS</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedLeave.status} />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted font-semibold block">APPLIED ON</span>
                  <span className="text-xs font-mono text-secondary mt-1 block">
                    {selectedLeave.appliedAt ? selectedLeave.appliedAt.substring(0, 10) : selectedLeave.startDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-lg border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="text-muted block text-[11px]">Employee</span>
                  <span className="font-semibold text-primary mt-0.5 block">{selectedLeave.employee?.name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Department</span>
                  <span className="text-secondary mt-0.5 block">{selectedLeave.employee?.department?.name || 'General'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Leave Category</span>
                  <span className="font-medium text-primary mt-0.5 block">{selectedLeave.leaveType?.name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Duration</span>
                  <span className="font-semibold text-primary mt-0.5 block">{calculateDuration(selectedLeave.startDate, selectedLeave.endDate)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted block text-[11px]">Schedule Window</span>
                  <span className="font-mono text-secondary mt-0.5 block">{selectedLeave.startDate} &rarr; {selectedLeave.endDate}</span>
                </div>
              </div>

              {selectedLeave.reason && (
                <div className="p-3 rounded-lg border text-xs" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary font-semibold block mb-1">Reason:</span>
                  <p className="text-primary italic m-0">"{selectedLeave.reason}"</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK DECISION MODAL */}
      {reviewModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {reviewModal.actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                </h3>
                <p className="modal-subtitle">Leave #{reviewModal.leave?.id} &bull; {reviewModal.leave?.employee?.name}</p>
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

            <div className="modal-body space-y-3 text-xs">
              <p className="text-secondary m-0">
                Are you sure you want to <strong>{reviewModal.actionType?.toUpperCase()}</strong> the leave request of{' '}
                <strong className="text-primary">{reviewModal.leave?.employee?.name}</strong> for{' '}
                <span className="font-mono">{reviewModal.leave?.startDate} &rarr; {reviewModal.leave?.endDate}</span>?
              </p>

              {conflictData && (
                <div className="p-3 rounded border" style={{ background: conflictData.canApprove ? 'var(--color-success-light)' : 'var(--color-danger-light)', borderColor: conflictData.canApprove ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  <span className="font-semibold block" style={{ color: conflictData.canApprove ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {conflictData.canApprove ? 'Conflict Pre-Check: Compliant' : 'Conflict Pre-Check: Conflicts Detected'}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeReviewModal}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${reviewModal.actionType === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={() => handleDecision(reviewModal.actionType)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : `Confirm ${reviewModal.actionType === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Cancel Leave Request</h3>
                <p className="modal-subtitle">Leave #{cancelModal.leave?.id}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeCancelModal}
                disabled={actionLoading}
              >
                &times;
              </button>
            </div>

            <div className="modal-body text-xs text-secondary">
              Are you sure you want to cancel this pending application? The scheduled days will be restored to your leave quota.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeCancelModal}
                disabled={actionLoading}
              >
                Keep Request
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaves;
