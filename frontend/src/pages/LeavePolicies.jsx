import React, { useEffect, useState } from 'react';
import { leavePolicyApi, leaveTypeApi, departmentApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  IconLeaves,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconCheck,
} from '../components/Icons';

function LeavePolicies() {
  const [policies, setPolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Policy Modal State
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
      const [polRes, ltRes, deptRes] = await Promise.all([
        leavePolicyApi.getAll(),
        leaveTypeApi.getAll(),
        departmentApi.getAll(),
      ]);

      setPolicies(polRes.data || []);
      setLeaveTypes(ltRes.data || []);
      setDepartments(deptRes.data || []);

      if (ltRes.data?.length > 0 && !policyForm.leaveTypeId) {
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

  const filteredPolicies = policies.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (p.leaveType?.name || '').toLowerCase().includes(term) ||
      (p.department?.name || 'global').toLowerCase().includes(term);

    const matchesDept =
      deptFilter === 'ALL' ||
      (deptFilter === 'GLOBAL' && !p.department) ||
      String(p.department?.id) === deptFilter;

    return matchesSearch && matchesDept;
  });

  const globalCount = policies.filter((p) => !p.department).length;
  const deptSpecificCount = policies.filter((p) => p.department).length;
  const approvalRequiredCount = policies.filter((p) => p.requiresApproval).length;

  return (
    <div className="leave-policies-page">
      <PageHeader
        title="Leave Policy Governance"
        subtitle="Configure organizational entitlement quotas, department-specific overrides, consecutive day limits, and approval rules"
        badge={`${policies.length} Policy Rules`}
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowPolicyModal(true)}
            >
              <IconPlus size={16} />
              <span>Add Policy Rule</span>
            </button>
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Policy Rules</span>
          <span className="stat-value">{policies.length} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Active</small></span>
          <span className="stat-helper">Across all categories & scopes</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Scope Breakdown</span>
          <span className="stat-value" style={{ color: 'var(--primary-color, #4f46e5)' }}>
            {globalCount} <small style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Global /</small> {deptSpecificCount} <small style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Dept</small>
          </span>
          <span className="stat-helper">Global base vs departmental overrides</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approval Governance</span>
          <span className="stat-value" style={{ color: 'var(--emerald-500, #10b981)' }}>
            {approvalRequiredCount} <small style={{ fontSize: '1rem', fontWeight: 500 }}>Rules</small>
          </span>
          <span className="stat-helper">Mandatory manager approval enforced</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <IconSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '36px', height: '40px' }}
                placeholder="Search policy by leave category or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '180px' }}>
              <select
                className="form-select"
                style={{ height: '40px' }}
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="ALL">All Scopes</option>
                <option value="GLOBAL">Global Only</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="content-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner size="lg" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading leave policy rules...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <EmptyState
            icon={<IconLeaves size={36} className="text-muted" />}
            title="No policy rules found"
            description={
              searchTerm || deptFilter !== 'ALL'
                ? 'No policies match the selected search or department filter.'
                : 'Configure rules linking leave categories to annual entitlements, department overrides, and approval thresholds.'
            }
            actionText="Add Policy Rule"
            onAction={() => setShowPolicyModal(true)}
          />
        ) : (
          <div className="table-responsive">
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
                {filteredPolicies.map((p) => (
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
          </div>
        )}
      </div>

      {/* Add Policy Modal */}
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
                  <label className="form-label">Department Scope (Optional — default is Global)</label>
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
                  <label className="form-label">Annual Entitlement Days *</label>
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
                    placeholder="e.g. 10 (Leave blank for no limit)"
                    value={policyForm.maxConsecutiveDays}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxConsecutiveDays: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={policyForm.requiresApproval}
                      onChange={(e) => setPolicyForm({ ...policyForm, requiresApproval: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Requires managerial approval</span>
                  </label>
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

export default LeavePolicies;
