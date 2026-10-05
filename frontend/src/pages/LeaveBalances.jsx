import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeApi, leaveTypeApi, leaveBalanceApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import {
  IconLeaves,
  IconPlus,
  IconSearch,
  IconRefresh,
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
        // Employee only needs their own balances
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
    <div className="leave-balances-page">
      <PageHeader
        title={isEmployeeRole ? 'My Leave Balances' : 'Employee Leave Balances'}
        subtitle={
          isEmployeeRole
            ? 'View your leave quotas, track approved days taken, and check remaining leave balances'
            : 'Audit employee time-off entitlement quotas, monitor approved consumption, and initialize balances'
        }
        badge={`${balances.length} Balances`}
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
                onClick={() => setShowBalanceModal(true)}
              >
                <IconPlus size={16} />
                <span>Initialize Balance</span>
              </button>
            )}
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Allocated Quota</span>
          <span className="stat-value">{totalEntitled} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Days</small></span>
          <span className="stat-helper">{isEmployeeRole ? 'Your total leave quota' : 'Across active employee balances'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved & Consumed</span>
          <span className="stat-value" style={{ color: 'var(--amber-500, #f59e0b)' }}>{totalUsed} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Days</small></span>
          <span className="stat-helper">{isEmployeeRole ? 'Used from your quotas' : 'Deducted from active quotas'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Available Balance</span>
          <span className="stat-value" style={{ color: 'var(--emerald-500, #10b981)' }}>{totalRemaining} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Days</small></span>
          <span className="stat-helper">{isEmployeeRole ? 'Your remaining time-off pool' : 'Net remaining time-off pool'}</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="content-card">
        {/* Search & Filter Toolbar */}
        {!isEmployeeRole && (
          <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <IconSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '40px' }}
                  placeholder="Search by employee, department, or leave type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {employees.length > 0 && (
                <div style={{ minWidth: '200px' }}>
                  <select
                    className="form-select"
                    style={{ height: '40px' }}
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
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner size="lg" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading leave balances...</p>
          </div>
        ) : filteredBalances.length === 0 ? (
          <EmptyState
            icon={<IconLeaves size={36} className="text-muted" />}
            title="No leave balance records found"
            description={
              isEmployeeRole
                ? 'No leave balance quotas have been initialized for your account yet. Contact HR administration.'
                : 'No employee balances match your current filters. Use Initialize Balance to assign quotas.'
            }
            actionText={isHrAdmin ? 'Initialize Balance' : undefined}
            onAction={isHrAdmin ? () => setShowBalanceModal(true) : undefined}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {!isEmployeeRole && <th>Employee</th>}
                  {!isEmployeeRole && <th>Department</th>}
                  <th>Leave Type</th>
                  <th>Entitlement</th>
                  <th>Used Days</th>
                  <th>Remaining Balance</th>
                  <th>Utilization</th>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar name={item.employee?.name || 'User'} size="sm" />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.employee?.name || 'Unknown'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.employee?.employeeId || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {!isEmployeeRole && (
                        <td>
                          <span className="dept-tag-sm">
                            {item.employee?.department?.name || 'Unassigned'}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className="badge badge-pending" style={{ background: 'var(--primary-subtle, #e0e7ff)', color: 'var(--primary-dark, #3730a3)' }}>
                          {item.leaveType?.name || 'Leave Type'}
                        </span>
                      </td>
                      <td>
                        <span className="duration-pill">{item.entitlement} Days</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--amber-600, #d97706)', fontWeight: 600 }}>
                          {item.usedDays} Days
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            color: item.remainingBalance > 0 ? 'var(--emerald-600, #059669)' : 'var(--rose-600, #e11d48)',
                            fontWeight: 700,
                          }}
                        >
                          {item.remainingBalance} Days
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              background: 'var(--border-color, #e2e8f0)',
                              borderRadius: '999px',
                              overflow: 'hidden',
                              minWidth: '60px',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: pct > 80 ? 'var(--rose-500, #ef4444)' : 'var(--primary-color, #4f46e5)',
                                borderRadius: '999px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
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
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Initialize Employee Leave Balance</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBalanceModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateBalance}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Employee *</label>
                  <select
                    className="form-select"
                    value={balanceForm.employeeId}
                    onChange={(e) => setBalanceForm({ ...balanceForm, employeeId: e.target.value })}
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId}) &bull; {emp.department?.name || 'No Dept'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Leave Type *</label>
                  <select
                    className="form-select"
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
                </div>
                <div className="form-group">
                  <label className="form-label">Allocated Entitlement (Days) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    placeholder="e.g. 15"
                    value={balanceForm.entitlement}
                    onChange={(e) => setBalanceForm({ ...balanceForm, entitlement: e.target.value })}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    Sets the baseline quota for this employee. Remaining balance will update automatically as leave is approved.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBalanceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Balance Record
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
