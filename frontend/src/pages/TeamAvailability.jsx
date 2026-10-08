import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { departmentApi, availabilityApi, extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import {
  IconDepartments,
  IconCalendar,
  IconSearch,
  IconRefresh,
  IconCheck,
  IconLeaves,
  IconCheckCircle,
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

  useEffect(() => {
    if (selectedDeptId && selectedDate) {
      fetchAvailability(selectedDeptId, selectedDate);
    }
  }, [selectedDeptId, selectedDate]);

  const handleRefresh = () => {
    fetchAvailability(selectedDeptId, selectedDate);
  };

  return (
    <div className="team-availability-page space-y-6">
      <PageHeader
        title="Workforce & Team Availability"
        subtitle="Real-time capacity forecasting and attendance auditing across departments on selected calendar dates."
        badge={availability ? `${availability.availabilityPercentage}% Capacity` : 'Capacity Audit'}
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={loadingAvailability}
          >
            <IconRefresh size={14} className={loadingAvailability ? 'animate-spin' : ''} />
            <span>Refresh Assessment</span>
          </button>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Query Controls Card */}
      <div className="card-modern p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <FormField label="Target Department" required htmlFor="targetDept">
            <select
              id="targetDept"
              className="form-control text-xs"
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
          </FormField>

          <FormField label="Forecast Date" required htmlFor="forecastDate">
            <input
              id="forecastDate"
              type="date"
              className="form-control text-xs"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </FormField>

          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm w-full justify-center"
              onClick={handleRefresh}
              disabled={loadingAvailability || !selectedDeptId}
            >
              <IconSearch size={14} />
              <span>{loadingAvailability ? 'Calculating...' : 'Run Capacity Assessment'}</span>
            </button>
          </div>
        </div>
      </div>

      {loadingDepts || loadingAvailability ? (
        <div className="space-y-6">
          <SkeletonLoader variant="stat-grid" count={4} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonLoader variant="table" count={4} />
            <SkeletonLoader variant="table" count={4} />
          </div>
        </div>
      ) : !availability ? (
        <EmptyState
          title="Select Department and Date"
          description="Choose a department and calendar date above to compute workforce availability."
        />
      ) : availability.totalEmployees === 0 ? (
        <EmptyState
          title={`No Staff Allocated to ${availability.departmentName}`}
          description="There are currently zero employees assigned to this department in the organization registry."
        />
      ) : (
        <>
          {/* Availability Metrics KPI Cards - Compact SaaS Proportions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="Team Size"
              value={availability.totalEmployees}
              unit="staff"
              subtext="Assigned department roster"
              icon={<IconDepartments size={16} />}
              tone="slate"
            />

            <StatCard
              label="Available on Duty"
              value={availability.availableCount}
              unit="active"
              subtext="Present & available for work"
              icon={<IconCheck size={16} />}
              tone="emerald"
            />

            <StatCard
              label="On Approved Leave"
              value={availability.onLeaveCount}
              unit="absent"
              subtext="Approved scheduled leaves"
              icon={<IconLeaves size={16} />}
              tone={availability.onLeaveCount > 0 ? "amber" : "slate"}
            />

            <StatCard
              label="Availability Rate"
              value={`${Math.round(availability.availabilityPercentage)}%`}
              subtext={availability.availabilityPercentage >= 80 ? "Healthy duty capacity" : "Capacity threshold warning"}
              icon={<IconCheckCircle size={16} />}
              tone={availability.availabilityPercentage >= 80 ? "primary" : "rose"}
            />
          </div>

          {/* Categorized Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Employees Card */}
            <div className="card-modern p-5">
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h4 className="text-sm font-semibold text-primary m-0 flex items-center gap-1.5">
                    <IconCheck size={16} style={{ color: 'var(--color-success)' }} />
                    <span>Active on Duty ({availability.availableEmployees.length})</span>
                  </h4>
                  <p className="text-xs text-secondary m-0 mt-0.5">Staff scheduled on normal duty today</p>
                </div>
                <StatusBadge status="AVAILABLE" />
              </div>

              {availability.availableEmployees.length === 0 ? (
                <p className="text-muted text-xs italic py-4 text-center">
                  No personnel are available on duty for this date.
                </p>
              ) : (
                <div className="table-wrapper-modern">
                  <table className="table-modern">
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
                            <div className="flex items-center gap-2">
                              <Avatar name={emp.name} size="sm" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-primary text-xs leading-snug">{emp.name}</span>
                                <span className="text-[11px] font-mono text-muted leading-tight">{emp.employeeId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-xs text-secondary">{emp.designation || 'General'}</span>
                          </td>
                          <td>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded font-mono" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                              Present
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Employees on Leave Card */}
            <div className="card-modern p-5">
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h4 className="text-sm font-semibold text-primary m-0 flex items-center gap-1.5">
                    <IconLeaves size={16} style={{ color: 'var(--color-warning)' }} />
                    <span>On Approved Leave ({availability.onLeaveEmployees.length})</span>
                  </h4>
                  <p className="text-xs text-secondary m-0 mt-0.5">Personnel with approved absence on this date</p>
                </div>
                <StatusBadge status="APPROVED" />
              </div>

              {availability.onLeaveEmployees.length === 0 ? (
                <p className="text-muted text-xs italic py-4 text-center">
                  Full workforce attendance! No employees are on leave on this date.
                </p>
              ) : (
                <div className="table-wrapper-modern">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Leave Category</th>
                        <th>Stated Grounds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availability.onLeaveEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <Avatar name={emp.name} size="sm" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-primary text-xs leading-snug">{emp.name}</span>
                                <span className="text-[11px] font-mono text-muted leading-tight">{emp.employeeId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-xs font-medium text-primary">{emp.leaveType || 'Approved Leave'}</span>
                          </td>
                          <td>
                            <span className="text-xs text-secondary truncate max-w-xs block" title={emp.leaveReason}>
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
