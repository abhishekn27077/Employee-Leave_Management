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
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import {
  IconCheckCircle,
  IconAlertCircle,
  IconCheck,
  IconClock,
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

  // Mode for Manager/Admin: 'self' vs 'delegated'
  const [applyMode, setApplyMode] = useState('self');

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: user?.employeeId ? String(user.employeeId) : '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    handoverNotes: '',
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

        // Active employee defaults to authenticated user's profile if available
        const defaultEmpId = user?.employeeId
          ? String(user.employeeId)
          : emps.length > 0
          ? String(emps[0].id)
          : '';
        const initialLtId = lts.length > 0 ? String(lts[0].id) : '';

        setFormData((prev) => ({
          ...prev,
          employeeId: defaultEmpId,
          leaveTypeId: prev.leaveTypeId || initialLtId,
        }));

        if (defaultEmpId) {
          fetchBalances(defaultEmpId);
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [user?.employeeId]);

  const handleApplyModeChange = (mode) => {
    setApplyMode(mode);
    if (mode === 'self' && user?.employeeId) {
      const selfId = String(user.employeeId);
      setFormData((prev) => ({ ...prev, employeeId: selfId }));
      fetchBalances(selfId);
    }
  };

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
        }
      } finally {
        if (active) {
          setEvaluating(false);
        }
      }
    };

    const timer = setTimeout(runEvaluation, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData]);

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
      setError('Both commencement (start) and completion (end) dates are required.');
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
    if (submitting) return;
    setSubmitting(true);
    setError('');

    const fullReason = formData.handoverNotes
      ? `${formData.reason.trim()}\n\n[Handover: ${formData.handoverNotes.trim()}]`
      : formData.reason.trim();

    const payload = {
      employeeId: Number(formData.employeeId),
      leaveTypeId: Number(formData.leaveTypeId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: fullReason,
    };

    try {
      await leaveApi.apply(payload);
      setShowReviewModal(false);
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
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="lines" count={2} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonLoader variant="card" count={2} />
        </div>
      </div>
    );
  }

  const selectedLeaveType = leaveTypes.find((lt) => String(lt.id) === formData.leaveTypeId);
  const currentBalance = employeeBalances.find(
    (b) => String(b.leaveType?.id) === formData.leaveTypeId
  );

  const applyingEmployee = employees.find((e) => String(e.id) === formData.employeeId);

  const employeeDisplayName = isEmployeeRole || applyMode === 'self'
    ? user?.employeeName || user?.username || applyingEmployee?.name || 'Employee'
    : applyingEmployee?.name || 'Selected Employee';

  const employeeCode = isEmployeeRole || applyMode === 'self'
    ? user?.employeeCode || applyingEmployee?.employeeId || 'N/A'
    : applyingEmployee?.employeeId || 'N/A';

  const departmentName = isEmployeeRole || applyMode === 'self'
    ? user?.departmentName || applyingEmployee?.department?.name || 'General'
    : applyingEmployee?.department?.name || 'General';

  const designation = isEmployeeRole || applyMode === 'self'
    ? user?.designation || applyingEmployee?.designation || 'Staff Member'
    : applyingEmployee?.designation || 'Staff Member';

  const remainingBefore = evaluationResult?.remainingBalance !== undefined
    ? evaluationResult.remainingBalance
    : currentBalance?.remainingBalance ?? 0;

  const effectiveDeduction = evaluationResult?.calculatedEffectiveDays || 0;
  const projectedRemainingAfter = Math.max(0, remainingBefore - effectiveDeduction);

  // Stepper state evaluation
  const step1Complete = Boolean(formData.employeeId);
  const step2Complete = Boolean(formData.leaveTypeId);
  const step3Complete = Boolean(formData.startDate && formData.endDate && new Date(formData.endDate) >= new Date(formData.startDate));
  const step4Complete = Boolean(formData.reason.trim());
  const step5Ready = step1Complete && step2Complete && step3Complete && step4Complete;

  const currentStep = 
    !step2Complete ? 2 :
    !step3Complete ? 3 :
    !step4Complete ? 4 : 5;

  const stepperItems = [
    { num: 1, title: 'Employee', isComplete: step1Complete, isCurrent: currentStep === 1 },
    { num: 2, title: 'Leave Type', isComplete: step2Complete, isCurrent: currentStep === 2 },
    { num: 3, title: 'Dates', isComplete: step3Complete, isCurrent: currentStep === 3 },
    { num: 4, title: 'Reason', isComplete: step4Complete, isCurrent: currentStep === 4 },
    { num: 5, title: 'Review', isComplete: step5Ready, isCurrent: currentStep === 5 },
  ];

  return (
    <div className="apply-leave-page space-y-5">
      <PageHeader
        title="Apply for Leave"
        subtitle="Submit a formal time-off request with live conflict evaluation, holiday exemptions, and balance validation."
        actions={
          <Link to="/leaves?scope=mine" className="btn btn-secondary btn-sm">
            <span>&larr; My Leave History</span>
          </Link>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Real Professional Stepper */}
      <div className="card-modern p-3">
        {/* Desktop Stepper */}
        <div className="stepper-container">
          {stepperItems.map((step, idx) => (
            <div
              key={step.num}
              className={`stepper-step ${step.isComplete ? 'completed' : ''} ${step.isCurrent ? 'current' : ''}`}
            >
              <div className="stepper-circle">
                {step.isComplete && step.num < currentStep ? <IconCheck size={12} /> : step.num}
              </div>
              <span className="stepper-label">{step.title}</span>
              {idx < stepperItems.length - 1 && (
                <div className={`stepper-line ${step.isComplete && step.num < currentStep ? 'active' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Mobile Stepper Bar */}
        <div className="stepper-mobile-bar">
          <span className="text-xs font-semibold text-primary">
            Step {currentStep} of 5: {stepperItems[currentStep - 1]?.title}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="w-5 h-1.5 rounded-full"
                style={{
                  background: n < currentStep ? 'var(--color-accent)' : n === currentStep ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Application Form (7 cols) */}
        <div className="card-modern lg:col-span-7 p-5">
          <form onSubmit={handleOpenReview} className="space-y-5">
            {/* 1. EMPLOYEE IDENTITY SECTION */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  1. Applying Employee
                </span>
                {!isEmployeeRole && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-[11px]">
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded font-medium ${applyMode === 'self' ? 'bg-white text-primary shadow-xs' : 'text-muted'}`}
                      onClick={() => handleApplyModeChange('self')}
                    >
                      Apply for myself
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded font-medium ${applyMode === 'delegated' ? 'bg-white text-primary shadow-xs' : 'text-muted'}`}
                      onClick={() => handleApplyModeChange('delegated')}
                    >
                      On behalf of employee
                    </button>
                  </div>
                )}
              </div>

              {isEmployeeRole || applyMode === 'self' ? (
                <div
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={employeeDisplayName} size="md" />
                    <div>
                      <div className="font-semibold text-primary text-xs">
                        {employeeDisplayName}
                      </div>
                      <div className="text-[11px] text-muted">
                        ID: <span className="font-mono font-medium text-secondary">{employeeCode}</span> &bull; {departmentName} &bull; {designation}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded uppercase" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    Applying as Self
                  </span>
                </div>
              ) : (
                <FormField label="Target Employee" required htmlFor="employeeId" hint="Select the departmental employee you are lodging this request for">
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
                </FormField>
              )}
            </div>

            {/* 2. REQUEST DETAILS SECTION */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">
                2. Leave Category & Quota
              </span>
              <FormField
                label="Leave Category"
                required
                htmlFor="leaveTypeId"
                hint={
                  currentBalance
                    ? `Available Quota: ${currentBalance.remainingBalance} / ${currentBalance.entitlement} days`
                    : selectedLeaveType?.description || undefined
                }
              >
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
              </FormField>
            </div>

            {/* 3. DATES SECTION */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">
                3. Schedule & Duration
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FormField label="Start Date" required htmlFor="startDate">
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </FormField>

                <FormField label="End Date" required htmlFor="endDate">
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    className="form-control"
                    min={formData.startDate || undefined}
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </FormField>
              </div>
            </div>

            {/* 4. REASON & WORK HANDOVER SECTION */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">
                4. Reason & Handover
              </span>
              <FormField
                label="Reason for Leave"
                required
                htmlFor="reason"
                hint="Provide clear business context for supervisor evaluation"
              >
                <textarea
                  id="reason"
                  name="reason"
                  rows={2}
                  className="form-control"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="e.g. Annual wellness leave, medical recuperation, family commitment..."
                  required
                />
              </FormField>

              <FormField
                label="Work Handover Details (Optional)"
                htmlFor="handoverNotes"
                hint="Designated colleagues, active task coverage, or emergency contact"
              >
                <input
                  id="handoverNotes"
                  name="handoverNotes"
                  type="text"
                  className="form-control"
                  value={formData.handoverNotes}
                  onChange={handleChange}
                  placeholder="e.g. Project handover to Sarah Jenkins; available via email for urgent items."
                />
              </FormField>
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <Link to="/leaves?scope=mine" className="btn btn-secondary btn-sm">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={evaluating || (evaluationResult && !evaluationResult.canApprove)}
              >
                <span>Continue to Review &rarr;</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Impact & Conflict Analysis Panel (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="card-modern p-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-xs font-semibold text-primary uppercase m-0 tracking-wider">
                Live Pre-Submission Analysis
              </h3>
              {evaluating && (
                <span className="text-[11px] text-muted flex items-center gap-1 font-mono">
                  <span className="status-dot status-dot-pending animate-ping" />
                  Auditing...
                </span>
              )}
            </div>

            {evaluationError ? (
              <div className="p-3 rounded text-xs flex items-start gap-2" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                <IconAlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{evaluationError}</span>
              </div>
            ) : !evaluationResult ? (
              <div className="py-6 text-center text-muted text-xs">
                <IconClock size={24} className="mx-auto mb-2 text-slate-300" />
                Select leave category and dates to run automated working-day calculation and conflict checks.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Result Status Banner */}
                <div
                  className="p-2.5 rounded flex items-center gap-2"
                  style={{
                    background: evaluationResult.canApprove ? '#ecfdf5' : '#fef2f2',
                    color: evaluationResult.canApprove ? '#047857' : '#b91c1c',
                    border: `1px solid ${evaluationResult.canApprove ? '#a7f3d0' : '#fecaca'}`,
                  }}
                >
                  {evaluationResult.canApprove ? (
                    <>
                      <IconCheckCircle size={15} />
                      <span className="font-semibold">Eligible for Submission</span>
                    </>
                  ) : (
                    <>
                      <IconAlertCircle size={15} />
                      <span className="font-semibold">Conflict Detected &mdash; Cannot Submit</span>
                    </>
                  )}
                </div>

                {/* Day Deductions & Quota Arithmetic Breakdown */}
                <div className="p-3 rounded space-y-2" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block border-b pb-1" style={{ borderColor: 'var(--color-border)' }}>
                    Quota & Working-Day Impact
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">Requested:</span>
                    <span className="font-semibold text-primary font-mono">{evaluationResult.requestedDays} {evaluationResult.requestedDays === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">Holidays:</span>
                    <span className="font-medium text-emerald-600 font-mono">
                      {evaluationResult.holidayCount || 0} {evaluationResult.holidayCount === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">Effective deduction:</span>
                    <span className="font-bold text-primary font-mono">{effectiveDeduction} {effectiveDeduction === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-secondary">Available balance:</span>
                    <span className="font-mono font-medium text-primary">{remainingBefore} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">Remaining after request:</span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: projectedRemainingAfter > 0 ? '#16a34a' : '#dc2626' }}
                    >
                      {projectedRemainingAfter} days
                    </span>
                  </div>
                </div>

                {/* Conflict Engine Automated Validation Checklist */}
                <div className="analysis-checklist">
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block border-b pb-1 mb-1" style={{ borderColor: 'var(--color-border)' }}>
                    Policy & Schedule Verification
                  </span>
                  
                  {/* 1. Balance Check */}
                  {(() => {
                    const hasBalError = evaluationResult.conflicts?.some(
                      (c) => c.type === 'INSUFFICIENT_BALANCE' || (c.message && c.message.toLowerCase().includes('balance'))
                    ) || (remainingBefore < effectiveDeduction);
                    return (
                      <div className={`analysis-check-item ${hasBalError ? 'fail' : 'pass'}`}>
                        {hasBalError ? <IconAlertCircle size={14} /> : <IconCheck size={14} />}
                        <span>{hasBalError ? 'Insufficient leave balance' : 'Balance sufficient'}</span>
                      </div>
                    );
                  })()}

                  {/* 2. Overlap Check */}
                  {(() => {
                    const hasOverlap = evaluationResult.conflicts?.some(
                      (c) => c.type === 'OVERLAPPING_REQUEST' || (c.message && c.message.toLowerCase().includes('overlap'))
                    );
                    return (
                      <div className={`analysis-check-item ${hasOverlap ? 'fail' : 'pass'}`}>
                        {hasOverlap ? <IconAlertCircle size={14} /> : <IconCheck size={14} />}
                        <span>{hasOverlap ? 'Overlapping leave request detected' : 'No overlapping leave'}</span>
                      </div>
                    );
                  })()}

                  {/* 3. Policy Compliance Check */}
                  {(() => {
                    const hasPolicyError = evaluationResult.conflicts?.some(
                      (c) => c.type === 'POLICY_VIOLATION' || 
                             (c.message && (c.message.toLowerCase().includes('consecutive') || c.message.toLowerCase().includes('notice')))
                    );
                    return (
                      <div className={`analysis-check-item ${hasPolicyError ? 'fail' : 'pass'}`}>
                        {hasPolicyError ? <IconAlertCircle size={14} /> : <IconCheck size={14} />}
                        <span>{hasPolicyError ? 'Exceeds policy consecutive-day rules' : 'Policy compliant'}</span>
                      </div>
                    );
                  })()}

                  {/* 4. Team Availability Check */}
                  {(() => {
                    const hasAvailWarn = evaluationResult.conflicts?.some(
                      (c) => c.type === 'DEPARTMENT_THRESHOLD' || 
                             (c.message && (c.message.toLowerCase().includes('threshold') || c.message.toLowerCase().includes('availability')))
                    );
                    return (
                      <div className={`analysis-check-item ${hasAvailWarn ? 'warning' : 'pass'}`}>
                        {hasAvailWarn ? <IconAlertCircle size={14} /> : <IconCheck size={14} />}
                        <span>{hasAvailWarn ? 'Department availability threshold warning' : 'Team availability acceptable'}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Additional Detailed Messages if any */}
                {evaluationResult.conflicts && evaluationResult.conflicts.length > 0 && (
                  <div className="p-2.5 rounded text-xs space-y-1" style={{ background: '#fff1f2', border: '1px solid #fecaca' }}>
                    <span className="font-semibold text-rose-700 block">Conflict Explanations:</span>
                    <ul className="pl-4 space-y-1 list-disc text-rose-600 m-0">
                      {evaluationResult.conflicts.map((c, idx) => (
                        <li key={idx}>{c.message || c.type}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Before Submit Modal */}
      {showReviewModal && (
        <div className="modal-backdrop">
          <div className="modal-container max-w-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Review Leave Application</h3>
                <p className="modal-subtitle">
                  Verify request parameters before formal submission to your manager.
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

            <div className="modal-body space-y-3">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Employee:</span>
                  <span className="font-semibold text-primary">{employeeDisplayName} ({employeeCode})</span>
                </div>

                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Department:</span>
                  <span className="font-medium text-primary">{departmentName}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Leave Category:</span>
                  <span className="font-semibold text-primary">{selectedLeaveType?.name}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Scheduled Dates:</span>
                  <span className="font-mono font-semibold text-primary">{formData.startDate} &rarr; {formData.endDate}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Working Days Deducted:</span>
                  <span className="font-bold text-primary font-mono">
                    {effectiveDeduction} Days
                    {evaluationResult?.holidayCount > 0 && (
                      <span className="text-muted font-normal ml-1">
                        ({evaluationResult.holidayCount} holiday excluded)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-secondary">Projected Balance After Approval:</span>
                  <span className="font-mono font-bold" style={{ color: projectedRemainingAfter > 0 ? '#16a34a' : '#dc2626' }}>
                    {projectedRemainingAfter} Days
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-secondary block mb-1">Reason:</span>
                  <div className="p-2.5 rounded text-xs italic" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    "{formData.reason}"
                  </div>
                </div>

                {formData.handoverNotes && (
                  <div className="pt-1">
                    <span className="text-secondary block mb-1">Handover Notes:</span>
                    <div className="p-2.5 rounded text-xs" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                      {formData.handoverNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowReviewModal(false)}
                disabled={submitting}
              >
                &larr; Back & Edit
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
