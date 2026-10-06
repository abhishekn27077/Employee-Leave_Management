import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeApi, leaveTypeApi, leaveAdjustmentApi, leaveBalanceApi, extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconLeaves,
  IconCheckCircle,
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
      leaveBalanceApi
        .getByEmployee(form.employeeId)
        .then((res) => {
          const list = res.data || [];
          const found = list.find((b) => b.leaveType?.id === Number(form.leaveTypeId));
          setSelectedBalance(found || null);
        })
        .catch(() => setSelectedBalance(null));
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
      setError('Please select both an employee and a leave category.');
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
    <div className="leave-adjustments-page space-y-6">
      <PageHeader
        title="Leave Balance Adjustments"
        subtitle="Authorized balance adjustments, quota corrections, and immutable audit logs."
        badge={`${adjustments.length} Adjustments`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              disabled={loading}
            >
              <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {isHrAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenModal}
              >
                <IconPlus size={14} />
                <span>New Adjustment</span>
              </button>
            )}
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stats - Compact SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Total Adjustments"
          value={adjustments.length}
          unit="entries"
          subtext="Balance transactions logged"
          icon={<IconLeaves size={16} />}
          tone="slate"
        />

        <StatCard
          label="Credit Additions (+)"
          value={totalPositive}
          unit="days"
          subtext="Quota increases granted"
          icon={<IconCheckCircle size={16} />}
          tone="emerald"
        />

        <StatCard
          label="Debit Deductions (-)"
          value={totalNegative}
          unit="days"
          subtext="Quota reductions applied"
          icon={<IconLeaves size={16} />}
          tone="amber"
        />
      </div>

      {/* Content Card with Toolbar and Table */}
      <div className="card-modern">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="search-input-wrapper flex-1 min-w-[240px]">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="search-input text-xs"
              placeholder="Search employee, reason, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="form-control text-xs min-w-[180px]"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => {
                const empDisplay = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
                const empCode = emp.employeeId ? ` (${emp.employeeId})` : '';
                return (
                  <option key={emp.id} value={emp.id}>
                    {empDisplay}{empCode}
                  </option>
                );
              })}
            </select>

            <span className="text-xs text-muted font-mono">
              {filteredAdjustments.length} of {adjustments.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={5} />
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <EmptyState
            title="No adjustments found"
            description={
              searchTerm || selectedEmployeeFilter !== 'ALL'
                ? 'No leave adjustments match your search criteria.'
                : 'No manual balance corrections have been recorded.'
            }
            actionText={isHrAdmin && adjustments.length === 0 ? 'Create First Adjustment' : undefined}
            onAction={isHrAdmin && adjustments.length === 0 ? handleOpenModal : undefined}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ref #</th>
                  <th>Employee</th>
                  <th>Leave Category</th>
                  <th>Adjustment</th>
                  <th>Reason / Justification</th>
                  <th>Reference ID</th>
                  <th>Recorded At</th>
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
                        <span className="font-mono text-xs text-muted">#{adj.id}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={empName} size="sm" />
                          <div>
                            <span className="font-semibold text-primary text-xs block">{empName}</span>
                            <div className="flex items-center gap-1 text-[11px] text-muted">
                              {empCode && <span className="font-mono">{empCode}</span>}
                              <span>&bull;</span>
                              <span>{deptName}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-primary">{adj.leaveType?.name}</span>
                      </td>
                      <td>
                        <span
                          className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                          style={{
                            background: isPositive ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                            color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${isPositive ? 'var(--color-success)' : 'var(--color-danger)'}`,
                          }}
                        >
                          {isPositive ? `+${adj.adjustmentDays}` : adj.adjustmentDays} Days
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-secondary truncate max-w-xs block" title={adj.reason}>
                          {adj.reason}
                        </span>
                      </td>
                      <td>
                        {adj.reference ? (
                          <span className="font-mono text-xs text-muted">{adj.reference}</span>
                        ) : (
                          <span className="text-muted text-xs italic">—</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs text-muted">
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

      {/* Create Adjustment Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Manual Balance Adjustment</h3>
                <p className="modal-subtitle">Directly credit or debit an employee's leave quota with audit justification</p>
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
              <div className="modal-body space-y-4">
                <FormField label="Target Employee" required htmlFor="adjEmp">
                  <select
                    id="adjEmp"
                    className="form-control text-xs"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                  >
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
                </FormField>

                <FormField label="Leave Category" required htmlFor="adjLt">
                  <select
                    id="adjLt"
                    className="form-control text-xs"
                    value={form.leaveTypeId}
                    onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                    required
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Live Current Balance Preview */}
                {selectedBalance && (
                  <div className="p-3 rounded-lg border text-xs flex justify-between items-center" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                    <span className="text-secondary">Current Balance for this category:</span>
                    <span className="font-mono font-bold text-primary">
                      {selectedBalance.remainingBalance} Days remaining / {selectedBalance.entitlement} Days total
                    </span>
                  </div>
                )}

                <FormField
                  label="Adjustment Days"
                  required
                  htmlFor="adjDays"
                  hint="Enter a positive integer (e.g., 5) to grant additional days, or negative (e.g., -3) to deduct days."
                >
                  <input
                    id="adjDays"
                    type="number"
                    className="form-control text-xs font-mono font-bold"
                    placeholder="e.g. 5 or -3"
                    value={form.adjustmentDays}
                    onChange={(e) => setForm({ ...form, adjustmentDays: e.target.value })}
                    required
                  />
                </FormField>

                <FormField
                  label="Reason / Managerial Authorization"
                  required
                  htmlFor="adjReason"
                  hint="Explain why this adjustment is made (e.g., Overtime comp-time compensation, sabbatical deduction)."
                >
                  <textarea
                    id="adjReason"
                    className="form-control text-xs"
                    rows={2}
                    placeholder="Document the justification for this quota change..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Reference Document / Ticket (Optional)" htmlFor="adjRef">
                  <input
                    id="adjRef"
                    type="text"
                    className="form-control text-xs"
                    placeholder="e.g. HR-2026-089 or COMP-TICKET-44"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="modal-actions pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting ? 'Applying Adjustment...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
