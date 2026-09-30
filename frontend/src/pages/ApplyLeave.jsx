import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeeApi, leaveTypeApi, leaveApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import PageHeader from '../components/PageHeader';
import {
  IconCalendar,
  IconPlus,
  IconClock,
  IconInfo,
} from '../components/Icons';

function ApplyLeave() {
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

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

        if (emps.length > 0) {
          setFormData((prev) => ({ ...prev, employeeId: String(emps[0].id) }));
        }
        if (lts.length > 0) {
          setFormData((prev) => ({ ...prev, leaveTypeId: String(lts[0].id) }));
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getDurationInfo = () => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      return {
        isValid: false,
        text: 'Invalid range: End date precedes start date',
      };
    }
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return {
      isValid: true,
      text: `${diffDays} Calendar ${diffDays === 1 ? 'Day' : 'Days'}`,
      days: diffDays,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.employeeId) {
      setError('Please select an employee profile.');
      return;
    }
    if (!formData.leaveTypeId) {
      setError('Please select a leave policy category.');
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

    setSubmitting(true);
    const payload = {
      employeeId: Number(formData.employeeId),
      leaveTypeId: Number(formData.leaveTypeId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason.trim(),
    };

    try {
      const res = await leaveApi.apply(payload);
      setSuccess(`Leave request #${res.data.id} submitted successfully with status PENDING!`);
      // Reset dates & reason
      setFormData((prev) => ({
        ...prev,
        startDate: '',
        endDate: '',
        reason: '',
      }));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Preparing leave application form..." fullHeight />;
  }

  const durationInfo = getDurationInfo();
  const selectedLeaveType = leaveTypes.find((lt) => String(lt.id) === formData.leaveTypeId);

  return (
    <div className="apply-leave-page">
      <PageHeader
        title="File Leave Request"
        subtitle="Submit a formal time-off booking for administrative review and workflow approval"
        actions={
          <Link to="/leaves" className="btn btn-secondary">
            <span>&larr; View All Requests</span>
          </Link>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {employees.length === 0 || leaveTypes.length === 0 ? (
        <div className="content-card p-6 text-center">
          <div className="empty-state">
            <h3 className="empty-state-title">Setup Incomplete</h3>
            <p className="empty-state-description">
              {employees.length === 0
                ? 'No employees are registered in the system. You must create at least one employee profile first.'
                : 'No leave policies have been configured. You must configure at least one leave policy first.'}
            </p>
            <Link
              to={employees.length === 0 ? '/employees' : '/leave-types'}
              className="btn btn-primary mt-3"
            >
              {employees.length === 0 ? 'Go to Employees' : 'Go to Leave Types'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="apply-layout-grid">
          {/* Main Form Card */}
          <div className="content-card apply-form-card">
            <div className="content-card-header">
              <h2 className="section-title">Application Details</h2>
              <span className="required-notice"><span className="text-danger">*</span> Required fields</span>
            </div>

            <form onSubmit={handleSubmit} className="apply-form-body">
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="employeeId">
                  Applying Employee <span className="text-danger">*</span>
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
                      {emp.name} ({emp.employeeId}) &mdash; {emp.department?.name || 'No Dept'}
                    </option>
                  ))}
                </select>
                <span className="form-help-text">
                  The staff member on whose behalf this time-off request is being lodged.
                </span>
              </div>

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="leaveTypeId">
                  Leave Policy Category <span className="text-danger">*</span>
                </label>
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
                      {lt.name} &mdash; {lt.defaultDays} Days Annual Quota
                    </option>
                  ))}
                </select>
                {selectedLeaveType && (
                  <div className="policy-hint-box">
                    <span className="policy-hint-title">{selectedLeaveType.name}:</span>
                    <span className="policy-hint-desc">
                      {selectedLeaveType.description || 'Standard corporate leave guidelines apply.'}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="startDate">
                    Commencement Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="endDate">
                    Conclusion Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    className="form-control"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Duration Box */}
              {durationInfo && (
                <div
                  className={`duration-calculator-box mb-4 ${
                    durationInfo.isValid ? 'duration-valid' : 'duration-invalid'
                  }`}
                >
                  <div className="duration-icon">
                    <IconCalendar size={18} />
                  </div>
                  <div className="duration-content">
                    <span className="duration-title">Computed Time-Off Window</span>
                    <span className="duration-value">{durationInfo.text}</span>
                  </div>
                </div>
              )}

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="reason">
                  Reason & Business Context <span className="text-danger">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  className="form-control"
                  placeholder="State the objective, personal necessity, or coverage arrangement for the requested leave duration..."
                  value={formData.reason}
                  onChange={handleChange}
                  required
                />
                <span className="form-help-text">
                  This narrative will be reviewed by department managers during approval.
                </span>
              </div>

              <div className="form-actions-row">
                <Link to="/leaves" className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  <IconPlus size={16} />
                  <span>{submitting ? 'Lodging Request...' : 'Submit Leave Request'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Policy & Workflow Guidelines */}
          <div className="apply-sidebar-info">
            <div className="content-card info-card mb-4">
              <h3 className="info-card-title">
                <IconClock size={16} className="text-primary" />
                <span>Approval Lifecycle</span>
              </h3>
              <ol className="lifecycle-list">
                <li>
                  <div className="lifecycle-step-num">1</div>
                  <div className="lifecycle-step-body">
                    <strong>Submission (Pending)</strong>
                    <p>Request is immediately entered into the system with initial state PENDING.</p>
                  </div>
                </li>
                <li>
                  <div className="lifecycle-step-num">2</div>
                  <div className="lifecycle-step-body">
                    <strong>Managerial Evaluation</strong>
                    <p>Department leads audit team calendar capacity and leave policy entitlement.</p>
                  </div>
                </li>
                <li>
                  <div className="lifecycle-step-num">3</div>
                  <div className="lifecycle-step-body">
                    <strong>Final Determination</strong>
                    <p>Decision transitions state to APPROVED, REJECTED, or CANCELLED with audit trails.</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="content-card info-card">
              <h3 className="info-card-title">
                <IconInfo size={16} className="text-primary" />
                <span>Active Leave Quotas</span>
              </h3>
              <div className="quota-quick-list">
                {leaveTypes.map((lt) => (
                  <div key={lt.id} className="quota-quick-item">
                    <span className="quota-type-name">{lt.name}</span>
                    <span className="quota-type-days">{lt.defaultDays} d/yr</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplyLeave;
