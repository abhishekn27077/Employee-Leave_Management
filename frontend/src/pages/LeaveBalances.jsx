import React, { useEffect, useState } from 'react';
import { employeeApi, leaveTypeApi, departmentApi, leaveBalanceApi, leavePolicyApi, extractErrorMessage } from '../services/api';
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
  IconCheck,
} from '../components/Icons';

function LeaveBalances() {
  const [activeTab, setActiveTab] = useState('balances'); // 'balances' | 'policies'
  const [balances, setBalances] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Balance Modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    entitlement: '',
  });

  // Policy Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    leaveTypeId: '',
    departmentId: '',
    entitlement: '',
    maxConsecutiveDays: '',
    requiresApproval: true,
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [balRes, polRes, empRes, ltRes, deptRes] = await Promise.all([
        leaveBalanceApi.getAll(),
        leavePolicyApi.getAll(),
        employeeApi.getAll(),
        leaveTypeApi.getAll(),
        departmentApi.getAll(),
      ]);
      setBalances(balRes.data || []);
      setPolicies(polRes.data || []);
      setEmployees(empRes.data || []);
      setLeaveTypes(ltRes.data || []);
      setDepartments(deptRes.data || []);

      if (empRes.data?.length > 0 && !balanceForm.employeeId) {
        setBalanceForm((prev) => ({ ...prev, employeeId: String(empRes.data[0].id) }));
      }
      if (ltRes.data?.length > 0 && !balanceForm.leaveTypeId) {
        setBalanceForm((prev) => ({ ...prev, leaveTypeId: String(ltRes.data[0].id) }));
        setPolicyForm((prev) => ({ ...prev, leaveTypeId: String(ltRes.data[0].id) }));
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

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await leavePolicyApi.create({
        leaveTypeId: Number(policyForm.leaveTypeId),
        departmentId: policyForm.departmentId ? Number(policyForm.departmentId) : null,
        entitlement: Number(policyForm.entitlement),
        maxConsecutiveDays: policyForm.maxConsecutiveDays ? Number(policyForm.maxConsecutiveDays) : null,
        requiresApproval: policyForm.requiresApproval,
      });
      setSuccess('Leave policy configured successfully!');
      setShowPolicyModal(false);
      setPolicyForm((prev) => ({ ...prev, entitlement: '', maxConsecutiveDays: '' }));
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
        title="Leave Balances & Policy Framework"
        subtitle="Audit employee time-off entitlement quotas, monitor approved consumption, and manage policy rules"
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
            {activeTab === 'balances' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowBalanceModal(true)}
              >
                <IconPlus size={16} />
                <span>Initialize Balance</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowPolicyModal(true)}
              >
                <IconPlus size={16} />
                <span>Add Policy Rule</span>
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
          <span className="stat-helper">Across all employee balances</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved & Consumed</span>
          <span className="stat-value" style={{ color: 'var(--amber-500, #f59e0b)' }}>{totalUsed} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Days</small></span>
          <span className="stat-helper">Deducted from active quotas</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Available Balance</span>
          <span className="stat-value" style={{ color: 'var(--emerald-500, #10b981)' }}>{totalRemaining} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Days</small></span>
          <span className="stat-helper">Net remaining time-off pool</span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="filter-tabs-bar">
        <button
          type="button"
          className={`filter-tab-btn ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          <span className="tab-label">Employee Balances</span>
          <span className="tab-badge tab-badge-all">{balances.length}</span>
        </button>
        <button
          type="button"
          className={`filter-tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          <span className="tab-label">Policy Governance</span>
          <span className="tab-badge tab-badge-all">{policies.length}</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="content-card">
        {activeTab === 'balances' ? (
          <>
            <div className="card-toolbar">
              <div className="search-input-wrapper">
                <IconSearch size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Filter by employee, ID, department, or policy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '180px' }}
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
                <span className="toolbar-count">
                  {filteredBalances.length} Records
                </span>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner message="Loading employee balances..." />
            ) : filteredBalances.length === 0 ? (
              <EmptyState
                icon={<IconLeaves size={36} className="text-muted" />}
                title="No leave balance records"
                description="Initialize employee balance quotas or submit leave applications to generate records automatically."
                actionText="Initialize First Balance"
                onAction={() => setShowBalanceModal(true)}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Leave Category</th>
                      <th>Entitled Quota</th>
                      <th>Approved / Used</th>
                      <th>Remaining Balance</th>
                      <th>Quota Consumption</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBalances.map((item) => {
                      const empName = item.employee?.name || 'Employee';
                      const pct = item.entitlement > 0
                        ? Math.min(100, Math.round(((item.usedDays || 0) / item.entitlement) * 100))
                        : 0;

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="employee-cell-avatar">
                              <Avatar name={empName} size={32} />
                              <div className="employee-info-cell">
                                <span className="employee-primary-name">{empName}</span>
                                <span className="code-pill-sm">{item.employee?.employeeId || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="dept-tag-sm">{item.employee?.department?.name || 'General'}</span>
                          </td>
                          <td>
                            <span className="policy-badge">{item.leaveType?.name || 'Standard'}</span>
                          </td>
                          <td>
                            <span className="duration-pill" style={{ fontWeight: 600 }}>
                              {item.entitlement} Days
                            </span>
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
          </>
        ) : (
          /* Policies Tab */
          <div className="table-responsive">
            {policies.length === 0 ? (
              <EmptyState
                icon={<IconLeaves size={36} className="text-muted" />}
                title="No policy rules configured"
                description="Add rules linking leave categories to annual entitlements, department overrides, and approval thresholds."
                actionText="Create Leave Policy"
                onAction={() => setShowPolicyModal(true)}
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Category</th>
                    <th>Department Scope</th>
                    <th>Annual Entitlement</th>
                    <th>Max Consecutive Days</th>
                    <th>Requires Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="policy-badge">{p.leaveType?.name || 'Leave Type'}</span>
                      </td>
                      <td>
                        <span className="dept-tag-sm">
                          {p.department?.name || 'All Departments (Global)'}
                        </span>
                      </td>
                      <td>
                        <span className="duration-pill" style={{ fontWeight: 600 }}>
                          {p.entitlement} Days
                        </span>
                      </td>
                      <td>
                        <span>{p.maxConsecutiveDays ? `${p.maxConsecutiveDays} Days` : 'No Limit'}</span>
                      </td>
                      <td>
                        {p.requiresApproval ? (
                          <span style={{ color: 'var(--emerald-600, #059669)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IconCheck size={14} /> Yes
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #64748b)' }}>No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                  <label className="form-label">Employee Profile *</label>
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
                  <label className="form-label">Leave Category *</label>
                  <select
                    className="form-select"
                    value={balanceForm.leaveTypeId}
                    onChange={(e) => setBalanceForm({ ...balanceForm, leaveTypeId: e.target.value })}
                    required
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} (Default: {lt.defaultDays} Days)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Allocated Entitlement (Days) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    placeholder="e.g. 15"
                    value={balanceForm.entitlement}
                    onChange={(e) => setBalanceForm({ ...balanceForm, entitlement: e.target.value })}
                    required
                  />
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

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Configure Leave Policy Rule</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPolicyModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreatePolicy}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Leave Category *</label>
                  <select
                    className="form-select"
                    value={policyForm.leaveTypeId}
                    onChange={(e) => setPolicyForm({ ...policyForm, leaveTypeId: e.target.value })}
                    required
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department Scope (Leave empty for Global/All)</label>
                  <select
                    className="form-select"
                    value={policyForm.departmentId}
                    onChange={(e) => setPolicyForm({ ...policyForm, departmentId: e.target.value })}
                  >
                    <option value="">All Departments (Global)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Entitlement Days *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    placeholder="e.g. 20"
                    value={policyForm.entitlement}
                    onChange={(e) => setPolicyForm({ ...policyForm, entitlement: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Consecutive Days</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    placeholder="e.g. 10 (Optional)"
                    value={policyForm.maxConsecutiveDays}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxConsecutiveDays: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPolicyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Policy Rule
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
