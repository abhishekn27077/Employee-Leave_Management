import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeApi, leaveTypeApi, leaveBalanceApi, extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import {
  IconLeaves,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconCalendar,
  IconCheckCircle,
} from '../components/Icons';

function LeaveBalances() {
  const { user } = useAuth();
  const isEmployeeRole = user?.role === 'EMPLOYEE';
  const isHrAdmin = user?.role === 'HR_ADMIN';

  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Balance Initialization Modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    entitlement: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isEmployeeRole) {
        const balRes = await leaveBalanceApi.getAll();
        setBalances(balRes.data || []);
      } else {
        const [balRes, empRes, ltRes] = await Promise.all([
          leaveBalanceApi.getAll(),
          employeeApi.getAll(),
          leaveTypeApi.getAll(),
        ]);
        setBalances(balRes.data || []);
        setEmployees(empRes.data || []);
        setLeaveTypes(ltRes.data || []);

        if (empRes.data?.length > 0 && !balanceForm.employeeId) {
          setBalanceForm((prev) => ({ ...prev, employeeId: String(empRes.data[0].id) }));
        }
        if (ltRes.data?.length > 0 && !balanceForm.leaveTypeId) {
          setBalanceForm((prev) => ({ ...prev, leaveTypeId: String(ltRes.data[0].id) }));
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBalance = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await leaveBalanceApi.create({
        employeeId: Number(balanceForm.employeeId),
        leaveTypeId: Number(balanceForm.leaveTypeId),
        entitlement: Number(balanceForm.entitlement),
      });
      setSuccess('Leave balance initialized successfully!');
      setShowBalanceModal(false);
      setBalanceForm((prev) => ({ ...prev, entitlement: '' }));
      fetchData();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  // Metrics
  const totalEntitled = balances.reduce((acc, b) => acc + (b.entitlement || 0), 0);
  const totalUsed = balances.reduce((acc, b) => acc + (b.usedDays || 0), 0);
  const totalRemaining = balances.reduce((acc, b) => acc + (b.remainingBalance || 0), 0);

  const filteredBalances = balances.filter((b) => {
    const empMatch =
      selectedEmployeeFilter === 'ALL' || String(b.employee?.id) === selectedEmployeeFilter;

    const term = searchTerm.toLowerCase();
    const searchMatch =
      !searchTerm ||
      (b.employee?.name || '').toLowerCase().includes(term) ||
      (b.employee?.employeeId || '').toLowerCase().includes(term) ||
      (b.leaveType?.name || '').toLowerCase().includes(term) ||
      (b.employee?.department?.name || '').toLowerCase().includes(term);

    return empMatch && searchMatch;
  });

  return (
    <div className="leave-balances-page space-y-6">
      <PageHeader
        title={isEmployeeRole ? 'My Leave Balances' : 'Employee Leave Quotas'}
        subtitle={
          isEmployeeRole
            ? 'View your annual leave entitlements, track approved days used, and verify remaining balances.'
            : 'Audit employee time-off entitlement quotas, monitor usage velocity, and initialize balances.'
        }
        badge={`${balances.length} Balances`}
        actions={
          <div className="flex items-center gap-2.5">
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
                onClick={() => setShowBalanceModal(true)}
              >
                <IconPlus size={14} />
                <span>Initialize Balance</span>
              </button>
            )}
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stats Grid - Compact SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Total Entitlement"
          value={`${totalEntitled} days`}
          subtext={isEmployeeRole ? 'Your full annual allocation' : 'Combined workforce quota'}
          icon={<IconCalendar size={16} />}
          tone="primary"
        />
        <StatCard
          label="Used Leave"
          value={`${totalUsed} days`}
          subtext={isEmployeeRole ? 'Approved days deducted' : 'Total days taken to date'}
          icon={<IconLeaves size={16} />}
          tone="amber"
        />
        <StatCard
          label="Remaining Balance"
          value={`${totalRemaining} days`}
          subtext={isEmployeeRole ? 'Available for future requests' : 'Net remaining quota pool'}
          icon={<IconCheckCircle size={16} />}
          tone="emerald"
        />
      </div>

      {/* Main Table Card */}
      <div className="card-modern">
        {/* Search & Filter Toolbar */}
        {!isEmployeeRole && (
          <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="search-input-wrapper flex-1 min-w-[240px]">
              <IconSearch size={14} className="search-icon" />
              <input
                type="text"
                className="search-input text-xs"
                placeholder="Search employee, department, or leave category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {employees.length > 0 && (
              <div className="min-w-[200px]">
                <select
                  className="form-control text-xs"
                  value={selectedEmployeeFilter}
                  onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                >
                  <option value="ALL">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={5} />
          </div>
        ) : filteredBalances.length === 0 ? (
          <EmptyState
            title="No leave balance records found"
            description={
              isEmployeeRole
                ? 'No leave balance quotas have been initialized for your profile yet. Please contact HR administration.'
                : 'No employee balance records match your filter criteria.'
            }
            actionText={isHrAdmin ? 'Initialize Balance' : undefined}
            onAction={isHrAdmin ? () => setShowBalanceModal(true) : undefined}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  {!isEmployeeRole && <th>Employee</th>}
                  {!isEmployeeRole && <th>Department</th>}
                  <th>Leave Category</th>
                  <th>Entitlement</th>
                  <th>Used Days</th>
                  <th>Remaining Balance</th>
                  <th style={{ minWidth: 150 }}>Quota Utilization</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((item) => {
                  const pct = item.entitlement > 0
                    ? Math.min(100, Math.round((item.usedDays / item.entitlement) * 100))
                    : 0;

                  return (
                    <tr key={item.id}>
                      {!isEmployeeRole && (
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={item.employee?.name || 'User'} size="sm" />
                            <div>
                              <div className="font-semibold text-primary text-xs">
                                {item.employee?.name || 'Unknown'}
                              </div>
                              <div className="text-[11px] font-mono text-muted">
                                {item.employee?.employeeId || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {!isEmployeeRole && (
                        <td>
                          <span className="text-secondary text-xs">
                            {item.employee?.department?.name || 'Unassigned'}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className="text-xs font-semibold text-primary">
                          {item.leaveType?.name || 'Leave Type'}
                        </span>
                      </td>
                      <td>
                        <span className="text-secondary font-mono text-xs">{item.entitlement} Days</span>
                      </td>
                      <td>
                        <span className="font-mono font-medium text-xs" style={{ color: 'var(--color-warning)' }}>
                          {item.usedDays} Days
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-mono font-bold text-xs"
                          style={{
                            color: item.remainingBalance > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {item.remainingBalance} Days
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-track flex-1">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 90 ? 'var(--color-danger)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-primary)',
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-medium text-secondary tabular-nums w-8 text-right">
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

      {/* Balance Initialization Modal */}
      {showBalanceModal && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Initialize Leave Quota</h3>
                <p className="modal-subtitle">Assign baseline annual leave entitlement to an employee profile</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBalanceModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateBalance}>
              <div className="modal-body space-y-4">
                <FormField label="Target Employee" required htmlFor="balanceEmp">
                  <select
                    id="balanceEmp"
                    className="form-control"
                    value={balanceForm.employeeId}
                    onChange={(e) => setBalanceForm({ ...balanceForm, employeeId: e.target.value })}
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId}) &bull; {emp.department?.name || 'General'}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Leave Category" required htmlFor="balanceLt">
                  <select
                    id="balanceLt"
                    className="form-control"
                    value={balanceForm.leaveTypeId}
                    onChange={(e) => setBalanceForm({ ...balanceForm, leaveTypeId: e.target.value })}
                    required
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} (Default: {lt.defaultDays} days)
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Allocated Entitlement (Days)"
                  required
                  htmlFor="balanceEnt"
                  hint="Baseline annual allowance. Remaining balance updates automatically as requests are approved."
                >
                  <input
                    id="balanceEnt"
                    type="number"
                    className="form-control"
                    min="1"
                    placeholder="e.g. 20"
                    value={balanceForm.entitlement}
                    onChange={(e) => setBalanceForm({ ...balanceForm, entitlement: e.target.value })}
                    required
                  />
                </FormField>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowBalanceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Initialize Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveBalances;
