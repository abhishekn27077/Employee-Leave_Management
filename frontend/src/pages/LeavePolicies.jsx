import React, { useEffect, useState } from 'react';
import { leavePolicyApi, leaveTypeApi, departmentApi, extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import {
  IconLeaves,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconCheck,
  IconCalendar,
  IconCheckCircle,
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
    <div className="leave-policies-page space-y-6">
      <PageHeader
        title="Leave Policy Governance"
        subtitle="Configure organizational entitlement quotas, departmental overrides, consecutive day limits, and approval mandates."
        badge={`${policies.length} Policy Rules`}
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
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowPolicyModal(true)}
            >
              <IconPlus size={14} />
              <span>Add Policy Rule</span>
            </button>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Summary Cards - Compact SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Total Policy Rules"
          value={policies.length}
          unit="rules"
          subtext="Active policy configurations"
          icon={<IconLeaves size={16} />}
          tone="slate"
        />

        <StatCard
          label="Scope Breakdown"
          value={`${globalCount} / ${deptSpecificCount}`}
          subtext="Global base vs departmental overrides"
          icon={<IconCalendar size={16} />}
          tone="primary"
        />

        <StatCard
          label="Approval Governance"
          value={approvalRequiredCount}
          unit="enforced"
          subtext="Rules mandating manager authorization"
          icon={<IconCheckCircle size={16} />}
          tone="emerald"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card-modern">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="search-input-wrapper flex-1 min-w-[240px]">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="search-input text-xs"
              placeholder="Search policy by leave category or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <select
              className="form-control text-xs"
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

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={5} />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <EmptyState
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
          <div className="table-wrapper-modern">
            <table className="table-modern">
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
                      <span className="font-semibold text-primary text-xs">{p.leaveType?.name || 'Leave Type'}</span>
                    </td>
                    <td>
                      <span className="text-secondary text-xs">
                        {p.department?.name || 'All Departments (Global)'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono font-semibold text-xs text-primary">
                        {p.entitlement} Days
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-secondary">{p.maxConsecutiveDays ? `${p.maxConsecutiveDays} Days` : 'No Limit'}</span>
                    </td>
                    <td>
                      {p.requiresApproval ? (
                        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                          <IconCheck size={13} /> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-muted">No</span>
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
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Configure Leave Policy Rule</h3>
                <p className="modal-subtitle">Define entitlement quotas and approval requirements</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPolicyModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreatePolicy}>
              <div className="modal-body space-y-4">
                <FormField label="Leave Category" required htmlFor="polLt">
                  <select
                    id="polLt"
                    className="form-control text-xs"
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
                </FormField>

                <FormField label="Department Scope" htmlFor="polDept" hint="Leave as Global for all departments unless creating a department-specific override.">
                  <select
                    id="polDept"
                    className="form-control text-xs"
                    value={policyForm.departmentId}
                    onChange={(e) => setPolicyForm({ ...policyForm, departmentId: e.target.value })}
                  >
                    <option value="">All Departments (Global Base)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Annual Entitlement" required htmlFor="polEnt">
                    <input
                      id="polEnt"
                      type="number"
                      className="form-control text-xs"
                      min="1"
                      placeholder="e.g. 20"
                      value={policyForm.entitlement}
                      onChange={(e) => setPolicyForm({ ...policyForm, entitlement: e.target.value })}
                      required
                    />
                  </FormField>

                  <FormField label="Max Consecutive Days" htmlFor="polMax">
                    <input
                      id="polMax"
                      type="number"
                      className="form-control text-xs"
                      min="1"
                      placeholder="No limit"
                      value={policyForm.maxConsecutiveDays}
                      onChange={(e) => setPolicyForm({ ...policyForm, maxConsecutiveDays: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={policyForm.requiresApproval}
                      onChange={(e) => setPolicyForm({ ...policyForm, requiresApproval: e.target.checked })}
                    />
                    <span className="font-medium text-primary">Mandatory managerial approval required</span>
                  </label>
                </div>
              </div>
              <div className="modal-actions pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPolicyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
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
