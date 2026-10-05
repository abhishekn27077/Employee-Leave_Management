import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  employeeApi,
  leaveTypeApi,
  leaveApi,
  leaveBalanceApi,
  extractErrorMessage,
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import {
  IconCalendar,
  IconCheckCircle,
  IconAlertCircle,
  IconCheck,
} from '../components/Icons';

export default function ApplyLeave() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEmployeeRole = user?.role === 'EMPLOYEE';

  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employeeBalances, setEmployeeBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluationError, setEvaluationError] = useState('');
  const [error, setError] = useState('');

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    employeeId: user?.employeeId ? String(user.employeeId) : '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const fetchBalances = async (empId) => {
    if (!empId) return;
    try {
      const res = await leaveBalanceApi.getByEmployee(empId);
      setEmployeeBalances(res.data || []);
    } catch {
      // Non-blocking
    }
  };

  // Load employee and leave type options
  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      setError('');
      try {
        const [empRes, ltRes] = await Promise.all([
          employeeApi.getAll(),
          leaveTypeApi.getAll(),
        ]);
        const emps = empRes.data || [];
        const lts = ltRes.data || [];
        setEmployees(emps);
        setLeaveTypes(lts);

        // For EMPLOYEE role, strictly lock to authenticated employeeId
        const activeEmpId = isEmployeeRole && user?.employeeId
          ? String(user.employeeId)
          : emps.length > 0
          ? String(emps[0].id)
          : '';
        const initialLtId = lts.length > 0 ? String(lts[0].id) : '';

        setFormData((prev) => ({
          ...prev,
          employeeId: activeEmpId,
          leaveTypeId: prev.leaveTypeId || initialLtId,
        }));

        if (activeEmpId) {
          fetchBalances(activeEmpId);
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [isEmployeeRole, user?.employeeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // If start date moves past end date, align end date
      if (name === 'startDate' && next.endDate && next.endDate < value) {
        next.endDate = value;
      }
      return next;
    });

    if (name === 'employeeId' && value) {
      fetchBalances(value);
    }
  };

  // Live Conflict & Policy Evaluation (Debounced)
  useEffect(() => {
    const { employeeId, leaveTypeId, startDate, endDate, reason } = formData;

    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      setEvaluationResult(null);
      setEvaluationError('');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setEvaluationResult(null);
      setEvaluationError('End date cannot precede commencement date.');
      return;
    }

    let active = true;
    const runEvaluation = async () => {
      setEvaluating(true);
      setEvaluationError('');
      try {
        const payload = {
          employeeId: Number(employeeId),
          leaveTypeId: Number(leaveTypeId),
          startDate,
          endDate,
          reason: reason ? reason.trim() : 'Preliminary conflict audit',
        };
        const res = await leaveApi.evaluateConflicts(payload);
        if (active) {
          setEvaluationResult(res.data);
        }
      } catch (err) {
        if (active) {
          setEvaluationError(extractErrorMessage(err));
          setEvaluationResult(null);
        }
      } finally {
        if (active) {
          setEvaluating(false);
        }
      }
    };

    const timer = setTimeout(runEvaluation, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.employeeId, formData.leaveTypeId, formData.startDate, formData.endDate]);

  const handleOpenReview = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.employeeId) {
      setError('Please select an employee profile.');
      return;
    }
    if (!formData.leaveTypeId) {
      setError('Please select a leave category.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Both start date and end date are required.');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    if (!formData.reason.trim()) {
      setError('Reason for leave application cannot be blank.');
      return;
    }

    if (evaluationResult && !evaluationResult.canApprove) {
      setError('Cannot proceed: there are blocking policy or schedule conflicts that must be resolved first.');
      return;
    }

    setShowReviewModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (submitting) return; // Prevent accidental duplicate submissions
    setSubmitting(true);
    setError('');

    const payload = {
      employeeId: Number(formData.employeeId),
      leaveTypeId: Number(formData.leaveTypeId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason.trim(),
    };

    try {
      await leaveApi.apply(payload);
      setShowReviewModal(false);
      // Redirect to My Leave Requests with positive confirmation message
      navigate('/leaves?scope=mine', {
        state: {
          successMessage: 'Your leave request has been submitted and is awaiting manager approval.',
        },
        replace: true,
      });
    } catch (err) {
      setError(extractErrorMessage(err));
      setShowReviewModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Preparing leave application form..." fullHeight />;
  }

  const selectedLeaveType = leaveTypes.find((lt) => String(lt.id) === formData.leaveTypeId);
  const currentBalance = employeeBalances.find(
    (b) => String(b.leaveType?.id) === formData.leaveTypeId
  );

  const applyingEmployee = isEmployeeRole
    ? null
    : employees.find((e) => String(e.id) === formData.employeeId);

  const employeeDisplayName = isEmployeeRole
    ? user?.employeeName || user?.username || 'Employee'
    : applyingEmployee?.name || 'Selected Employee';

  const employeeCode = isEmployeeRole
    ? user?.employeeCode || 'N/A'
    : applyingEmployee?.employeeId || 'N/A';

  const departmentName = isEmployeeRole
    ? user?.departmentName || 'General'
    : applyingEmployee?.department?.name || 'General';

  const designation = isEmployeeRole
    ? user?.designation || 'Staff Member'
    : applyingEmployee?.designation || 'Staff Member';

  const remainingBefore = evaluationResult?.remainingBalance !== undefined
    ? evaluationResult.remainingBalance
    : currentBalance?.remainingBalance ?? 0;

  const effectiveDeduction = evaluationResult?.calculatedEffectiveDays || 0;
  const projectedRemainingAfter = Math.max(0, remainingBefore - effectiveDeduction);

  return (
    <div className="apply-leave-page">
      <PageHeader
        title="Apply for Leave"
        subtitle="Submit a formal time-off booking with automated conflict checking, holiday exemption, and policy review"
        actions={
          <Link to="/leaves?scope=mine" className="btn btn-secondary">
            <span>&larr; My Leave History</span>
          </Link>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Step Indicator Pipeline */}
      <div
        className="card"
        style={{
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>1</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Employee</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>&rarr;</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: formData.leaveTypeId ? '#2563eb' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>2</span>
            <span style={{ fontWeight: 600, color: formData.leaveTypeId ? '#0f172a' : '#64748b' }}>Leave Type</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>&rarr;</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: formData.startDate && formData.endDate ? '#2563eb' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>3</span>
            <span style={{ fontWeight: 600, color: formData.startDate && formData.endDate ? '#0f172a' : '#64748b' }}>Dates</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>&rarr;</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: formData.reason ? '#2563eb' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>4</span>
            <span style={{ fontWeight: 600, color: formData.reason ? '#0f172a' : '#64748b' }}>Reason</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>&rarr;</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: evaluationResult ? (evaluationResult.canApprove ? '#10b981' : '#ef4444') : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>5</span>
            <span style={{ fontWeight: 600, color: evaluationResult ? (evaluationResult.canApprove ? '#047857' : '#b91c1c') : '#64748b' }}>Review &amp; Submit</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left: Application Form */}
        <div className="card content-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Application Details
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
              All fields are required. Backend rules authoritatively evaluate balance and team scheduling.
            </p>
          </div>

          <form onSubmit={handleOpenReview}>
            {/* Step 1: Employee Identity Card */}
            {isEmployeeRole ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Applying Employee (Authenticated Self)
                </label>
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.625rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Avatar name={employeeDisplayName} size="md" />
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
                        {employeeDisplayName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                        ID: <span className="code-pill-sm">{employeeCode}</span> &bull; {departmentName} &bull; {designation}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.1875rem 0.5rem',
                      borderRadius: '0.375rem',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      textTransform: 'uppercase',
                    }}
                  >
                    Employee
                  </span>
                </div>
                <input type="hidden" name="employeeId" value={formData.employeeId} />
              </div>
            ) : (
              /* Administrative selection (HR_ADMIN only) */
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="employeeId" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Target Employee <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="employeeId"
                  name="employeeId"
                  className="form-control"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Choose Employee Profile --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name} ({emp.employeeId}) &mdash; {emp.department?.name || 'General'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 2: Leave Type & Balance Preview */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label htmlFor="leaveTypeId" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                  Leave Category <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {currentBalance && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: currentBalance.remainingBalance > 0 ? '#047857' : '#b91c1c',
                      fontWeight: 700,
                    }}
                  >
                    Available Balance: {currentBalance.remainingBalance} / {currentBalance.entitlement} days
                  </span>
                )}
              </div>
              <select
                id="leaveTypeId"
                name="leaveTypeId"
                className="form-control"
                value={formData.leaveTypeId}
                onChange={handleChange}
                required
              >
                <option value="">-- Choose Leave Category --</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={String(lt.id)}>
                    {lt.name} ({lt.defaultDays} Days Annual Allocation)
                  </option>
                ))}
              </select>
              {selectedLeaveType?.description && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.375rem 0 0' }}>
                  {selectedLeaveType.description}
                </p>
              )}
            </div>

            {/* Step 3: Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label htmlFor="startDate" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  Start Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  min={todayStr}
                  className="form-control"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                  End Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  min={formData.startDate || todayStr}
                  className="form-control"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Step 4: Reason */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="reason" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Reason &amp; Business Coverage Context <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="form-control"
                placeholder="State the purpose of this leave and handover arrangements..."
                value={formData.reason}
                onChange={handleChange}
                required
              />
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <Link to="/leaves?scope=mine" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                id="review-leave-btn"
                className="btn btn-primary"
                disabled={submitting || (evaluationResult && !evaluationResult.canApprove) || !!evaluationError}
              >
                <IconCheck size={16} />
                <span>Review Leave Request &rarr;</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Step 5 Conflict Evaluation & Policy Review Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            className="card content-card"
            style={{
              padding: '1.5rem',
              borderLeft: evaluationResult
                ? evaluationResult.canApprove
                  ? '4px solid #10b981'
                  : '4px solid #ef4444'
                : '4px solid #94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Live Conflict &amp; Policy Pre-Check
              </h3>
              {evaluating && (
                <span style={{ fontSize: '0.6875rem', color: '#6366f1', fontWeight: 600 }}>
                  Evaluating engine...
                </span>
              )}
            </div>

            {evaluationError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                {evaluationError}
              </div>
            )}

            {!evaluationResult && !evaluating && !evaluationError && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                <IconCalendar size={28} className="text-slate-400 mb-2" />
                <p style={{ margin: 0 }}>
                  Select dates and a leave category to trigger automated conflict evaluation, holiday exemptions, and team availability calculation.
                </p>
              </div>
            )}

            {evaluationResult && (
              <div>
                {/* Metric Summary Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ background: '#f8fafc', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>REQUESTED WINDOW</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {evaluationResult.calculatedTotalDays} calendar days
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>HOLIDAYS EXEMPT</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: evaluationResult.holidayCount > 0 ? '#16a34a' : '#475569', marginTop: '2px' }}>
                      {evaluationResult.holidayCount} days
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>EFFECTIVE DEDUCTION</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                      {evaluationResult.calculatedEffectiveDays} days
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, display: 'block' }}>AVAILABLE BALANCE</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {remainingBefore} days
                    </div>
                  </div>
                </div>

                {/* Team Availability Notice */}
                {evaluationResult.availabilityInfo && (
                  <div style={{ padding: '0.625rem 0.75rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe', marginBottom: '1rem', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '0.125rem' }}>
                      Department Staffing Availability: {Math.round(evaluationResult.availabilityInfo.availabilityPercentage)}%
                    </div>
                    <span style={{ color: '#3b82f6' }}>
                      Min threshold: {evaluationResult.availabilityInfo.minAvailabilityThreshold}% &bull; Available: {evaluationResult.availabilityInfo.availableEmployees} of {evaluationResult.availabilityInfo.totalEmployees} staff
                    </span>
                  </div>
                )}

                {/* Status Box */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    background: evaluationResult.canApprove ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${evaluationResult.canApprove ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {evaluationResult.canApprove ? (
                      <IconCheckCircle size={18} className="text-emerald-600" />
                    ) : (
                      <IconAlertCircle size={18} className="text-rose-600" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: evaluationResult.canApprove ? '#15803d' : '#b91c1c' }}>
                      {evaluationResult.canApprove
                        ? 'Policy Rules Compliant: Application ready to lodge'
                        : 'Blocking Conflicts Detected'}
                    </span>
                  </div>

                  {evaluationResult.conflicts && evaluationResult.conflicts.length > 0 && (
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#991b1b' }}>
                      {evaluationResult.conflicts.map((c, idx) => (
                        <li key={`conf-${idx}`} style={{ marginBottom: '2px' }}>
                          <strong>[{c.type}]</strong> {c.message}
                        </li>
                      ))}
                    </ul>
                  )}

                  {evaluationResult.warnings && evaluationResult.warnings.length > 0 && (
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#b45309' }}>
                      {evaluationResult.warnings.map((w, idx) => (
                        <li key={`warn-${idx}`}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Balance Breakdown Card */}
          {employeeBalances.length > 0 && (
            <div className="card content-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', margin: '0 0 0.75rem', textTransform: 'uppercase' }}>
                Your Current Quota Allocations
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {employeeBalances.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', padding: '0.375rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{b.leaveType?.name}</span>
                    <span style={{ color: '#64748b' }}>
                      <strong style={{ color: b.remainingBalance > 0 ? '#059669' : '#e11d48' }}>{b.remainingBalance}d</strong> remaining / {b.entitlement}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Before Submit Modal */}
      {showReviewModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Review Leave Request</h3>
                <p className="modal-subtitle">
                  Verify request parameters before formal submission to manager approval queue.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowReviewModal(false)}
                disabled={submitting}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Summary Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Employee:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{employeeDisplayName} ({employeeCode})</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Department:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{departmentName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Leave Category:</span>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedLeaveType?.name}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Date Window:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formData.startDate} &rarr; {formData.endDate}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Working Days Deducted:</span>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>
                    {effectiveDeduction} Days
                    {evaluationResult?.holidayCount > 0 && (
                      <small style={{ color: '#16a34a', fontWeight: 500, marginLeft: '6px' }}>
                        ({evaluationResult.holidayCount} holiday(s) exempt)
                      </small>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Current Balance:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{remainingBefore} days</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Balance After Approval:</span>
                  <span style={{ fontWeight: 700, color: projectedRemainingAfter > 0 ? '#059669' : '#e11d48' }}>
                    {projectedRemainingAfter} days
                  </span>
                </div>

                <div style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Reason &amp; Context:</span>
                  <div style={{ padding: '0.625rem 0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', color: '#334155', fontStyle: 'italic' }}>
                    "{formData.reason}"
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <IconCheckCircle size={18} />
                <span>Conflict engine verified: This request will be submitted with <strong>PENDING</strong> status.</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowReviewModal(false)}
                disabled={submitting}
              >
                &larr; Back &amp; Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting Application...' : 'Confirm & Submit Leave Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
