import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { departmentApi, availabilityApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import {
  IconDepartments,
  IconCalendar,
  IconSearch,
  IconRefresh,
  IconCheck,
  IconX,
  IconLeaves,
} from '../components/Icons';

function TeamAvailability() {
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(() => {
    return !isHrAdmin && user?.departmentId ? String(user.departmentId) : '';
  });
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [availability, setAvailability] = useState(null);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState('');

  // Initial load: Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepts(true);
      setError('');
      try {
        const res = await departmentApi.getAll();
        let depts = res.data || [];

        // If not HR_ADMIN, only show the user's assigned department
        if (!isHrAdmin && user?.departmentId) {
          depts = depts.filter((d) => d.id === user.departmentId);
          setSelectedDeptId(String(user.departmentId));
        } else if (depts.length > 0 && !selectedDeptId) {
          setSelectedDeptId(String(depts[0].id));
        }

        setDepartments(depts);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoadingDepts(false);
      }
    };

    fetchDepartments();
  }, [isHrAdmin, user?.departmentId]);

  const fetchAvailability = async (deptId, dateStr) => {
    if (!deptId || !dateStr) return;
    setLoadingAvailability(true);
    setError('');
    try {
      const res = await availabilityApi.getDepartmentAvailability(deptId, dateStr);
      setAvailability(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
      setAvailability(null);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Trigger availability query whenever selected department or date changes
  useEffect(() => {
    if (selectedDeptId && selectedDate) {
      fetchAvailability(selectedDeptId, selectedDate);
    }
  }, [selectedDeptId, selectedDate]);

  const handleRefresh = () => {
    fetchAvailability(selectedDeptId, selectedDate);
  };

  return (
    <div className="team-availability-page">
      <PageHeader
        title="Workforce & Team Availability"
        subtitle="Real-time capacity forecasting and attendance auditing across departments on selected calendar dates"
        badge={availability ? `${availability.availabilityPercentage}% Ready` : 'Capacity Audit'}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loadingAvailability}
          >
            <IconRefresh size={16} />
            <span>Refresh Audit</span>
          </button>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Query Controls Card */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconDepartments size={16} />
              <span>Target Department</span>
            </label>
            <select
              className="form-select"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={loadingDepts}
            >
              {departments.length === 0 && <option value="">No departments available</option>}
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconCalendar size={16} />
              <span>Forecast Date</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={loadingAvailability || !selectedDeptId}
            >
              <IconSearch size={16} />
              <span>Run Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {loadingDepts || loadingAvailability ? (
        <LoadingSpinner message="Calculating real-time team availability and cross-referencing approved leaves..." />
      ) : !availability ? (
        <EmptyState
          icon={<IconDepartments size={36} className="text-muted" />}
          title="Select Department and Date"
          description="Choose a department and calendar date above to compute workforce availability."
        />
      ) : availability.totalEmployees === 0 ? (
        <div className="content-card">
          <EmptyState
            icon={<IconDepartments size={36} className="text-muted" />}
            title={`No Staff Allocated to ${availability.departmentName}`}
            description="There are currently zero employees assigned to this department in the organization registry."
          />
        </div>
      ) : (
        <>
          {/* Availability Metrics KPI Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <span className="stat-label">Total Department Roster</span>
              <span className="stat-value">{availability.totalEmployees}</span>
              <span className="stat-helper">Active personnel assigned</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Available on Duty</span>
              <span className="stat-value" style={{ color: 'var(--emerald-600, #059669)' }}>
                {availability.availableCount}
              </span>
              <span className="stat-helper">Active & ready for work</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">On Approved Leave</span>
              <span className="stat-value" style={{ color: 'var(--rose-600, #e11d48)' }}>
                {availability.onLeaveCount}
              </span>
              <span className="stat-helper">Exempt from duty</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Staffing Availability</span>
              <span
                className="stat-value"
                style={{
                  color:
                    availability.availabilityPercentage >= 80
                      ? 'var(--emerald-600, #059669)'
                      : availability.availabilityPercentage >= 50
                      ? 'var(--amber-600, #d97706)'
                      : 'var(--rose-600, #e11d48)',
                }}
              >
                {availability.availabilityPercentage}%
              </span>
              <div style={{ marginTop: '0.5rem', width: '100%', height: '6px', background: 'var(--border-color, #e2e8f0)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${availability.availabilityPercentage}%`,
                    height: '100%',
                    background:
                      availability.availabilityPercentage >= 80
                        ? 'var(--emerald-500, #10b981)'
                        : availability.availabilityPercentage >= 50
                        ? 'var(--amber-500, #f59e0b)'
                        : 'var(--rose-500, #ef4444)',
                    borderRadius: '999px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Categorized Lists */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Available Employees Card */}
            <div className="content-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-700, #047857)' }}>
                  <IconCheck size={18} />
                  <span>Available on Duty ({availability.availableEmployees.length})</span>
                </h4>
                <span className="badge badge-success">Active</span>
              </div>

              {availability.availableEmployees.length === 0 ? (
                <p className="text-muted" style={{ fontStyle: 'italic', margin: '1rem 0' }}>
                  No personnel are available on duty for this date.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role / Designation</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availability.availableEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div className="employee-cell-avatar">
                              <Avatar name={emp.name} size={30} />
                              <div className="employee-info-cell">
                                <span className="employee-primary-name">{emp.name}</span>
                                <span className="code-pill-sm">{emp.employeeId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.875rem' }}>{emp.designation || 'General'}</span>
                          </td>
                          <td>
                            <span className="badge badge-success">Present</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Employees on Leave Card */}
            <div className="content-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose-700, #be123c)' }}>
                  <IconLeaves size={18} />
                  <span>On Approved Leave ({availability.onLeaveEmployees.length})</span>
                </h4>
                <span className="badge badge-danger">Out of Office</span>
              </div>

              {availability.onLeaveEmployees.length === 0 ? (
                <p className="text-muted" style={{ fontStyle: 'italic', margin: '1rem 0' }}>
                  Full workforce attendance! No employees are on leave on this date.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Leave Policy</th>
                        <th>Reason / Grounds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availability.onLeaveEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div className="employee-cell-avatar">
                              <Avatar name={emp.name} size={30} />
                              <div className="employee-info-cell">
                                <span className="employee-primary-name">{emp.name}</span>
                                <span className="code-pill-sm">{emp.employeeId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="policy-badge">{emp.leaveType || 'Approved Leave'}</span>
                          </td>
                          <td>
                            <span className="text-muted" style={{ fontSize: '0.85rem' }} title={emp.leaveReason}>
                              {emp.leaveReason || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TeamAvailability;
