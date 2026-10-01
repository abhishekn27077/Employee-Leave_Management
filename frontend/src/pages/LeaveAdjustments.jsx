import React, { useEffect, useState } from 'react';
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
  IconCheck,
} from '../components/Icons';

export default function LeaveAdjustments() {
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
      employeeId: employees.length > 0 ? employees[0].id : '',
      leaveTypeId: leaveTypes.length > 0 ? leaveTypes[0].id : '',
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
      setError('Adjustment days must be a non-zero integer (positive or negative).');
      return;
    }
    if (!form.reason.trim()) {
      setError('Reason is required for accountability.');
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
    const empName = `${adj.employee?.firstName || ''} ${adj.employee?.lastName || ''}`.toLowerCase();
    const ltName = (adj.leaveType?.name || '').toLowerCase();
    const reason = (adj.reason || '').toLowerCase();
    const ref = (adj.reference || '').toLowerCase();
    const matchesSearch =
      !searchTerm ||
      empName.includes(searchLower) ||
      ltName.includes(searchLower) ||
      reason.includes(searchLower) ||
      ref.includes(searchLower);

    return matchesEmp && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Adjustments"
        description="Authorized leave balance corrections and immutable transaction logs"
        action={
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm"
          >
            <IconPlus size={16} />
            New Adjustment
          </button>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee, reason, ref..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.department?.name || 'No Dept'})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <IconRefresh size={16} />
          Refresh
        </button>
      </div>

      {/* Table Section */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredAdjustments.length === 0 ? (
        <EmptyState
          title="No Adjustments Found"
          description="No leave adjustments match your search criteria. Create one using the button above."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Adjustment</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdjustments.map((adj) => {
                  const isPositive = adj.adjustmentDays > 0;
                  return (
                    <tr key={adj.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">#{adj.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${adj.employee?.firstName || ''} ${adj.employee?.lastName || ''}`} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {adj.employee?.firstName} {adj.employee?.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {adj.employee?.department?.name || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-800">{adj.leaveType?.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPositive ? `+${adj.adjustmentDays}` : adj.adjustmentDays} days
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 max-w-xs truncate" title={adj.reason}>
                        {adj.reason}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-gray-500">
                        {adj.reference || <span className="text-gray-400 italic">None</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {adj.createdAt ? new Date(adj.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for creating leave adjustment */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Apply Leave Adjustment</h3>
            <p className="text-xs text-gray-500 mb-4">
              Balance adjustments directly alter entitlement and recalculate available days. Each adjustment is logged immutably.
            </p>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Employee *
                </label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department?.name || 'No Dept'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Leave Type *
                </label>
                <select
                  value={form.leaveTypeId}
                  onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs flex justify-between items-center text-indigo-900">
                  <span>Current Balance Status:</span>
                  {loadingBalance ? (
                    <span className="italic text-gray-500">Checking...</span>
                  ) : selectedBalance ? (
                    <span className="font-semibold">
                      Entitlement: {selectedBalance.entitlement} | Used: {selectedBalance.usedDays} | Remaining:{' '}
                      <span className="text-indigo-700 font-bold">{selectedBalance.remainingBalance}</span>
                    </span>
                  ) : (
                    <span className="text-gray-500">No active balance record yet (will initialize)</span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Adjustment Days * (e.g. +3 or -2)
                </label>
                <input
                  type="number"
                  step="1"
                  value={form.adjustmentDays}
                  onChange={(e) => setForm({ ...form, adjustmentDays: e.target.value })}
                  placeholder="Enter number (positive to grant, negative to deduct)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Reason *
                </label>
                <textarea
                  rows="2"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason for adjustment (required for accountability)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="HR Ticket / Approval ref (e.g. TICKET-1049)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
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
