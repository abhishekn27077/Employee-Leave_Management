import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeApi, leaveTypeApi, leaveAdjustmentApi, leaveBalanceApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconLeaves,
} from '../components/Icons';

export default function LeaveAdjustments() {
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';

  const [adjustments, setAdjustments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form modal / state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    adjustmentDays: '',
    reason: '',
    reference: '',
  });

  // Current balance preview for selected employee + leave type
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [adjRes, empRes, ltRes] = await Promise.all([
        leaveAdjustmentApi.getAll(),
        employeeApi.getAll(),
        leaveTypeApi.getAll(),
      ]);
      setAdjustments(adjRes.data || []);
      setEmployees(empRes.data || []);
      setLeaveTypes(ltRes.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch balance preview when form employee & leaveType change
  useEffect(() => {
    if (form.employeeId && form.leaveTypeId) {
      setLoadingBalance(true);
      leaveBalanceApi
        .getByEmployee(form.employeeId)
        .then((res) => {
          const list = res.data || [];
          const found = list.find((b) => b.leaveType?.id === Number(form.leaveTypeId));
          setSelectedBalance(found || null);
        })
        .catch(() => setSelectedBalance(null))
        .finally(() => setLoadingBalance(false));
    } else {
      setSelectedBalance(null);
    }
  }, [form.employeeId, form.leaveTypeId]);

  const handleOpenModal = () => {
    setForm({
      employeeId: employees.length > 0 ? String(employees[0].id) : '',
      leaveTypeId: leaveTypes.length > 0 ? String(leaveTypes[0].id) : '',
      adjustmentDays: '',
      reason: '',
      reference: '',
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.leaveTypeId) {
      setError('Please select both an employee and a leave type.');
      return;
    }
    const days = parseInt(form.adjustmentDays, 10);
    if (isNaN(days) || days === 0) {
      setError('Adjustment days must be a non-zero integer (positive to credit, negative to deduct).');
      return;
    }
    if (!form.reason.trim()) {
      setError('Reason is required for auditing and accountability.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await leaveAdjustmentApi.create({
        employeeId: Number(form.employeeId),
        leaveTypeId: Number(form.leaveTypeId),
        adjustmentDays: days,
        reason: form.reason.trim(),
        reference: form.reference.trim() || null,
      });

      setSuccess(`Successfully applied balance adjustment of ${days > 0 ? `+${days}` : days} days.`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesEmp =
      selectedEmployeeFilter === 'ALL' || adj.employee?.id === Number(selectedEmployeeFilter);
    const searchLower = searchTerm.toLowerCase();
    const empName = (adj.employee?.name || `${adj.employee?.firstName || ''} ${adj.employee?.lastName || ''}`.trim() || '').toLowerCase();
    const empCode = (adj.employee?.employeeId || '').toLowerCase();
    const deptName = (adj.employee?.department?.name || '').toLowerCase();
    const ltName = (adj.leaveType?.name || '').toLowerCase();
    const reason = (adj.reason || '').toLowerCase();
    const ref = (adj.reference || '').toLowerCase();
    const matchesSearch =
      !searchTerm ||
      empName.includes(searchLower) ||
      empCode.includes(searchLower) ||
      deptName.includes(searchLower) ||
      ltName.includes(searchLower) ||
      reason.includes(searchLower) ||
      ref.includes(searchLower);

    return matchesEmp && matchesSearch;
  });

  const totalPositive = adjustments.filter((a) => a.adjustmentDays > 0).length;
  const totalNegative = adjustments.filter((a) => a.adjustmentDays < 0).length;

  return (
    <div className="leave-adjustments-page">
      <PageHeader
        title="Leave Adjustments"
        subtitle="Authorized employee leave balance corrections and immutable audit transaction logs"
        badge={`${adjustments.length} Adjustments`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchData}
              disabled={loading}
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
            {isHrAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenModal}
              >
                <IconPlus size={16} />
                <span>New Adjustment</span>
              </button>
            )}
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Adjustments</span>
          <span className="stat-value">{adjustments.length}</span>
          <span className="stat-helper">Balance transactions logged</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Credit Additions (+)</span>
          <span className="stat-value" style={{ color: 'var(--emerald-600, #059669)' }}>
            {totalPositive}
          </span>
          <span className="stat-helper">Quota allocations granted</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Debit Deductions (-)</span>
          <span className="stat-value" style={{ color: 'var(--rose-600, #e11d48)' }}>
            {totalNegative}
          </span>
          <span className="stat-helper">Quota reductions applied</span>
        </div>
      </div>

      {/* Content Card with Toolbar and Table */}
      <div className="content-card">
        <div className="card-toolbar">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <div className="search-input-wrapper">
              <IconSearch size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search employee, reason, ref..."
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

            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="toolbar-select"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => {
                const empDisplay = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
                const empCode = emp.employeeId ? ` (${emp.employeeId})` : '';
                const dept = emp.department?.name ? ` - ${emp.department.name}` : '';
                return (
                  <option key={emp.id} value={emp.id}>
                    {empDisplay}{empCode}{dept}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="toolbar-count">
            Showing {filteredAdjustments.length} of {adjustments.length}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading adjustments..." />
        ) : filteredAdjustments.length === 0 ? (
          <EmptyState
            icon={<IconLeaves size={36} className="text-muted" />}
            title="No Adjustments Found"
            description={
              searchTerm || selectedEmployeeFilter !== 'ALL'
                ? 'No leave adjustments match your search criteria.'
                : 'No manual balance corrections have been recorded.'
            }
            actionText={isHrAdmin && adjustments.length === 0 ? 'Create First Adjustment' : null}
            onAction={isHrAdmin && adjustments.length === 0 ? handleOpenModal : null}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ref #</th>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Adjustment</th>
                  <th>Reason</th>
                  <th>Reference</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((adj) => {
                  const isPositive = adj.adjustmentDays > 0;
                  const empName = adj.employee?.name || `${adj.employee?.firstName || ''} ${adj.employee?.lastName || ''}`.trim() || 'Unknown Employee';
                  const empCode = adj.employee?.employeeId;
                  const deptName = adj.employee?.department?.name || 'General';

                  return (
                    <tr key={adj.id}>
                      <td>
                        <span className="code-pill">#{adj.id}</span>
                      </td>
                      <td>
                        <div className="employee-cell-avatar">
                          <Avatar name={empName} size={32} />
                          <div className="employee-info-cell">
                            <span className="employee-primary-name">{empName}</span>
                            <div className="cell-subtext-group">
                              {empCode && <span className="code-pill-sm">{empCode}</span>}
                              <span className="dept-tag-sm">{deptName}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="policy-badge">{adj.leaveType?.name}</span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${isPositive ? 'badge-approved' : 'badge-rejected'}`}
                          style={{ fontWeight: 700 }}
                        >
                          {isPositive ? `+${adj.adjustmentDays}` : adj.adjustmentDays} Days
                        </span>
                      </td>
                      <td>
                        <span className="reason-text" title={adj.reason}>
                          {adj.reason}
                        </span>
                      </td>
                      <td>
                        {adj.reference ? (
                          <span className="code-pill-sm">{adj.reference}</span>
                        ) : (
                          <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        <span className="timestamp-text">
                          {adj.createdAt ? new Date(adj.createdAt).toLocaleString() : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for creating leave adjustment */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Apply Leave Adjustment</h3>
                <p className="modal-subtitle">
                  Balance adjustments directly alter entitlement quotas and are immutably audited.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Employee *</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="form-control"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => {
                      const empDisplay = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
                      const empCode = emp.employeeId ? ` (${emp.employeeId})` : '';
                      const dept = emp.department?.name ? ` - ${emp.department.name}` : '';
                      return (
                        <option key={emp.id} value={emp.id}>
                          {empDisplay}{empCode}{dept}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Leave Type *</label>
                  <select
                    value={form.leaveTypeId}
                    onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                    className="form-control"
                    required
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} (Default: {lt.defaultDays} days)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current balance preview */}
                {form.employeeId && form.leaveTypeId && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-light)',
                      border: '1px solid var(--primary-border)',
                      fontSize: '0.8125rem',
                      color: 'var(--primary)',
                      marginBottom: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Current Quota Status:</span>
                    {loadingBalance ? (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Checking...</span>
                    ) : selectedBalance ? (
                      <span style={{ fontWeight: 600 }}>
                        Entitled: {selectedBalance.entitlement}d | Used: {selectedBalance.usedDays}d | Remaining:{' '}
                        <strong>{selectedBalance.remainingBalance}d</strong>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No record yet (will initialize)</span>
                    )}
                  </div>
                )}

                <div className="form-group mb-3">
                  <label className="form-label">Adjustment Days * (e.g. +3 or -2)</label>
                  <input
                    type="number"
                    step="1"
                    value={form.adjustmentDays}
                    onChange={(e) => setForm({ ...form, adjustmentDays: e.target.value })}
                    placeholder="Enter positive integer to credit, negative to deduct"
                    className="form-control"
                    required
                  />
                  <span className="form-help-text">Use positive values (e.g. 5) to add days, or negative (e.g. -2) to reduce.</span>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Reason *</label>
                  <textarea
                    rows="2"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Reason for adjustment (required for accountability)"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reference (Optional)</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="HR Ticket / Approval ref (e.g. TICKET-1049)"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Applying...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
