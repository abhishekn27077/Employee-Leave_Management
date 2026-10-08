import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  employeeApi,
  departmentApi,
  leaveBalanceApi,
  leaveApi,
  availabilityApi,
  extractErrorMessage,
} from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import {
  IconEmployees,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconCalendar,
  IconClock,
  IconInfo,
  IconCheck,
  IconLeaves,
  IconCheckCircle,
} from '../components/Icons';

function Employees() {
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isManager = user?.role === 'MANAGER';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teamAvailability, setTeamAvailability] = useState(null);
  const [departmentLeaves, setDepartmentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form modal (HR_ADMIN only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    designation: '',
    joiningDate: '',
    departmentId: '',
  });

  // Delete confirm dialog (HR_ADMIN only)
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Employee Detail Inspector Modal (HR_ADMIN and MANAGER)
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailBalances, setDetailBalances] = useState([]);
  const [detailLeaves, setDetailLeaves] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const todayStr = new Date().toISOString().substring(0, 10);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isManager && user?.departmentId) {
        const [empRes, deptRes, availRes, leavesRes] = await Promise.all([
          employeeApi.getAll(),
          departmentApi.getAll(),
          availabilityApi.getDepartmentAvailability(user.departmentId, todayStr).catch(() => ({ data: null })),
          leaveApi.getAll().catch(() => ({ data: [] })),
        ]);
        setEmployees(empRes.data || []);
        setDepartments(deptRes.data || []);
        setTeamAvailability(availRes?.data || null);
        setDepartmentLeaves(leavesRes?.data || []);
      } else {
        const [empRes, deptRes] = await Promise.all([
          employeeApi.getAll(),
          departmentApi.getAll(),
        ]);
        setEmployees(empRes.data || []);
        setDepartments(deptRes.data || []);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isManager, user?.departmentId]);

  // Open Employee Detail Inspector
  const openDetailModal = async (emp) => {
    setDetailTarget(emp);
    setDetailLoading(true);
    setDetailError('');
    setDetailBalances([]);
    setDetailLeaves([]);

    try {
      const [balRes, leaveRes] = await Promise.all([
        leaveBalanceApi.getByEmployee(emp.id).catch(() => ({ data: [] })),
        leaveApi.getByEmployee(emp.id).catch(() => ({ data: [] })),
      ]);
      setDetailBalances(balRes.data || []);
      setDetailLeaves(leaveRes.data || []);
    } catch (err) {
      setDetailError(extractErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailTarget(null);
    setDetailBalances([]);
    setDetailLeaves([]);
    setDetailError('');
  };

  // Create & Edit modals (HR_ADMIN only)
  const openCreateModal = () => {
    setEditEmp(null);
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      designation: '',
      joiningDate: new Date().toISOString().substring(0, 10),
      departmentId: departments.length > 0 ? String(departments[0].id) : '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditEmp(emp);
    setFormData({
      employeeId: emp.employeeId || '',
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      joiningDate: emp.joiningDate || '',
      departmentId: emp.department?.id ? String(emp.department.id) : '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditEmp(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      employeeId: formData.employeeId.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      designation: formData.designation.trim() || null,
      joiningDate: formData.joiningDate || null,
      department: formData.departmentId ? { id: Number(formData.departmentId) } : null,
    };

    try {
      if (editEmp) {
        await employeeApi.update(editEmp.id, payload);
        setSuccess(`Employee record for ${formData.name.trim()} was updated successfully!`);
      } else {
        await employeeApi.create(payload);
        setSuccess(`Employee ${formData.name.trim()} (${formData.employeeId.trim()}) registered successfully!`);
      }
      closeModal();
      fetchData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await employeeApi.delete(deleteTarget.id);
      setSuccess(`Employee record for "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !deptFilter || String(emp.department?.id) === deptFilter;

    return matchesSearch && matchesDept;
  });

  const getEmployeeAvailabilityStatus = (empId) => {
    if (!teamAvailability) return { onLeave: false };
    const onLeaveItem = teamAvailability.onLeaveEmployees?.find((e) => e.id === empId);
    if (onLeaveItem) {
      return {
        onLeave: true,
        leaveType: onLeaveItem.leaveType,
        reason: onLeaveItem.leaveReason,
      };
    }
    return { onLeave: false };
  };

  const getEmployeeUpcomingLeave = (empId) => {
    if (!departmentLeaves || departmentLeaves.length === 0) return null;
    const upcoming = departmentLeaves
      .filter((l) => l.employee?.id === empId && l.status === 'APPROVED' && l.startDate > todayStr)
      .sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
    return upcoming.length > 0 ? upcoming[0] : null;
  };

  return (
    <div className="employees-page space-y-6">
      <PageHeader
        title={isManager ? 'My Team' : 'Employee Directory'}
        subtitle={
          isManager
            ? `Department Team Workspace • ${user?.departmentName || 'Your Department'}`
            : 'Corporate workforce directory, departmental reporting assignments, and profile records.'
        }
        badge={
          isManager
            ? `${employees.length} Team Members`
            : `${employees.length} Staff`
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {isManager && (
              <>
                <Link to="/availability" className="btn btn-secondary btn-sm">
                  <IconCalendar size={14} />
                  <span>Team Availability</span>
                </Link>
                <Link to="/leaves?scope=approvals" className="btn btn-primary btn-sm">
                  <IconClock size={14} />
                  <span>Approval Queue</span>
                </Link>
              </>
            )}
            {isHrAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openCreateModal}
                disabled={departments.length === 0}
                title={departments.length === 0 ? 'Create a department first' : ''}
              >
                <IconPlus size={14} />
                <span>Register Employee</span>
              </button>
            )}
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Manager Team Availability Metrics Card - Compact SaaS Proportions */}
      {isManager && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            label="Total Team Staff"
            value={teamAvailability?.totalEmployees ?? employees.length}
            unit="staff"
            subtext={`Assigned to ${user?.departmentName || 'Department'}`}
            icon={<IconEmployees size={16} />}
            tone="slate"
          />

          <StatCard
            label="Present & On Duty"
            value={teamAvailability?.availableCount ?? (employees.length - (teamAvailability?.onLeaveCount || 0))}
            unit="active"
            subtext="Actively on duty"
            icon={<IconCheck size={16} />}
            tone="emerald"
          />

          <StatCard
            label="On Leave Today"
            value={teamAvailability?.onLeaveCount ?? 0}
            unit="absent"
            subtext="Scheduled absences"
            icon={<IconLeaves size={16} />}
            tone={(teamAvailability?.onLeaveCount ?? 0) > 0 ? "amber" : "slate"}
          />

          <StatCard
            label="Capacity Rate"
            value={teamAvailability?.availabilityPercentage != null ? `${Math.round(teamAvailability.availabilityPercentage)}%` : '100%'}
            subtext="Real-time duty ratio"
            icon={<IconCheckCircle size={16} />}
            tone="primary"
          />
        </div>
      )}

      {/* Scope banner */}
      <div className="p-3 rounded-lg border flex items-center justify-between flex-wrap gap-2 text-xs" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            Scope
          </span>
          <span className="text-secondary">
            {isManager
              ? `Department Team Scope — Filtered strictly to ${user?.departmentName || 'your department'}.`
              : 'Organization-wide Directory — HR Administrator authority.'}
          </span>
        </div>
        <span className="text-muted font-mono">Date: {todayStr}</span>
      </div>

      {departments.length === 0 && !loading && isHrAdmin && (
        <div className="p-3 rounded-lg border text-xs font-medium" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
          No departments configured. You must create at least one department before registering employees.
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="card-modern">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="search-input-wrapper flex-1 min-w-[240px]">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="search-input text-xs"
              placeholder={isManager ? "Search team members by name, ID, designation..." : "Search by name, ID, designation, email..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isHrAdmin && (
              <select
                id="deptFilter"
                className="form-control text-xs min-w-[180px]"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">All Departments ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            <span className="text-xs text-muted font-mono">
              {filteredEmployees.length} of {employees.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={6} />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            title={searchTerm || deptFilter ? 'No matching team members' : 'No employees in this scope'}
            description={
              searchTerm || deptFilter
                ? 'No employee profiles match the chosen search or department filter.'
                : isManager
                ? 'No employees are currently assigned to your department.'
                : 'Get started by creating your first employee profile and linking them to a department.'
            }
            actionText={searchTerm || deptFilter || isManager ? undefined : 'Register First Employee'}
            onAction={searchTerm || deptFilter || isManager ? undefined : openCreateModal}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Staff ID</th>
                  <th>Employee Name & Email</th>
                  {isHrAdmin && <th>Department</th>}
                  <th>Designation</th>
                  {isManager ? (
                    <>
                      <th style={{ width: '160px' }}>Today's Status</th>
                      <th>Upcoming Approved Leave</th>
                    </>
                  ) : (
                    <>
                      <th>Contact Phone</th>
                      <th>Joining Date</th>
                    </>
                  )}
                  <th style={{ textAlign: 'right', width: isHrAdmin ? '210px' : '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const availability = isManager ? getEmployeeAvailabilityStatus(emp.id) : null;
                  const upcomingLeave = isManager ? getEmployeeUpcomingLeave(emp.id) : null;

                  return (
                    <tr key={emp.id}>
                      <td>
                        <span className="font-mono text-xs font-semibold text-primary">{emp.employeeId}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.name} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary text-xs leading-snug">{emp.name}</span>
                            <span className="text-[11px] text-muted leading-tight">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      {isHrAdmin && (
                        <td>
                          <span className="text-secondary text-xs">
                            {emp.department?.name || 'Unassigned'}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className="text-xs text-primary font-medium">{emp.designation || 'Staff'}</span>
                      </td>

                      {isManager ? (
                        <>
                          <td>
                            {availability?.onLeave ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
                                On Leave: {availability.leaveType || 'Approved'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                                Active on Duty
                              </span>
                            )}
                          </td>
                          <td>
                            {upcomingLeave ? (
                              <div className="text-xs text-secondary">
                                <span className="font-semibold text-primary">
                                  {upcomingLeave.leaveType?.name || 'Leave'}:
                                </span>{' '}
                                <span className="font-mono">{upcomingLeave.startDate} to {upcomingLeave.endDate}</span>{' '}
                                <span className="text-muted font-mono">({upcomingLeave.numberOfDays || upcomingLeave.days}d)</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted">None scheduled</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="text-xs font-mono text-secondary">{emp.phone || '—'}</span>
                          </td>
                          <td>
                            <span className="text-xs font-mono text-secondary">{emp.joiningDate || '—'}</span>
                          </td>
                        </>
                      )}

                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                            onClick={() => openDetailModal(emp)}
                            title="View profile & leave summary"
                          >
                            <IconInfo size={12} />
                            <span>Details</span>
                          </button>

                          {isHrAdmin && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                                onClick={() => openEditModal(emp)}
                                title="Edit profile"
                              >
                                <IconEdit size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm text-[11px] py-1 px-2"
                                onClick={() => setDeleteTarget(emp)}
                                title="Delete profile"
                              >
                                <IconTrash size={12} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
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

      {/* EMPLOYEE DETAIL INSPECTOR MODAL */}
      <Modal
        isOpen={!!detailTarget}
        title="Employee Profile & Quotas"
        subtitle={detailTarget ? `${detailTarget.name} (${detailTarget.employeeId}) • ${detailTarget.department?.name || 'General'}` : ''}
        onClose={closeDetailModal}
        maxWidth="750px"
      >
        {detailTarget && (
          <div className="space-y-4">
            <AlertMessage type="error" message={detailError} onClose={() => setDetailError('')} />

            {/* Profile Overview Card */}
            <div className="p-4 rounded-lg border flex items-center gap-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <Avatar name={detailTarget.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-primary m-0">
                    {detailTarget.name}
                  </h3>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {detailTarget.employeeId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    {detailTarget.department?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">Designation</span>
                    <span className="font-medium text-primary mt-0.5 block">{detailTarget.designation || 'Staff'}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Email</span>
                    <span className="font-medium text-primary mt-0.5 block truncate">{detailTarget.email}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Phone</span>
                    <span className="font-mono text-primary mt-0.5 block">{detailTarget.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Joining Date</span>
                    <span className="font-mono text-primary mt-0.5 block">{detailTarget.joiningDate || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="py-6">
                <SkeletonLoader variant="lines" count={4} />
              </div>
            ) : (
              <>
                {/* Leave Balances Summary */}
                <div>
                  <h4 className="text-xs font-semibold text-secondary uppercase mb-2">
                    Leave Quota Allocation
                  </h4>

                  {detailBalances.length === 0 ? (
                    <div className="p-4 rounded-lg border text-center text-xs text-muted" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      No leave balance allocations recorded for this employee yet.
                    </div>
                  ) : (
                    <div className="table-wrapper-modern">
                      <table className="table-modern">
                        <thead>
                          <tr>
                            <th>Leave Category</th>
                            <th style={{ textAlign: 'center' }}>Entitlement</th>
                            <th style={{ textAlign: 'center' }}>Used</th>
                            <th style={{ textAlign: 'center' }}>Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailBalances.map((bal) => (
                            <tr key={bal.id}>
                              <td>
                                <strong className="text-primary text-xs">{bal.leaveType?.name || 'Leave'}</strong>
                              </td>
                              <td style={{ textAlign: 'center' }} className="font-mono text-xs text-secondary">{bal.entitlement}d</td>
                              <td style={{ textAlign: 'center', color: 'var(--color-warning)' }} className="font-mono text-xs font-medium">{bal.usedDays || bal.used || 0}d</td>
                              <td style={{ textAlign: 'center', color: 'var(--color-success)' }} className="font-mono text-xs font-bold">{bal.remainingBalance || bal.balance || 0}d</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Leave History */}
                <div>
                  <h4 className="text-xs font-semibold text-secondary uppercase mb-2">
                    Leave History ({detailLeaves.length})
                  </h4>

                  {detailLeaves.length === 0 ? (
                    <div className="p-4 rounded-lg border text-center text-xs text-muted" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      No leave requests submitted by this employee.
                    </div>
                  ) : (
                    <div className="table-wrapper-modern max-h-48 overflow-y-auto">
                      <table className="table-modern">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Schedule</th>
                            <th style={{ textAlign: 'center' }}>Days</th>
                            <th>Status</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailLeaves.map((leave) => (
                            <tr key={leave.id}>
                              <td>
                                <strong className="text-primary text-xs">{leave.leaveType?.name || 'Leave'}</strong>
                              </td>
                              <td className="text-xs font-mono text-secondary">
                                {leave.startDate} &rarr; {leave.endDate}
                              </td>
                              <td style={{ textAlign: 'center' }} className="font-mono text-xs font-semibold">
                                {leave.days || leave.numberOfDays}
                              </td>
                              <td>
                                <StatusBadge status={leave.status} />
                              </td>
                              <td>
                                <span className="text-xs text-muted truncate max-w-xs block" title={leave.reason}>
                                  {leave.reason || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="modal-actions border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeDetailModal}>
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Employee Create / Edit Modal (HR_ADMIN only) */}
      {isHrAdmin && (
        <Modal
          isOpen={isModalOpen}
          title={editEmp ? 'Edit Employee Profile' : 'Register New Employee'}
          subtitle={editEmp ? `Updating record for ${editEmp.name} (${editEmp.employeeId})` : 'Create employee record with departmental assignment'}
          onClose={closeModal}
          maxWidth="600px"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Staff Identifier (ID)" required htmlFor="employeeId">
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. EMP100"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField label="Full Legal Name" required htmlFor="name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Alex Morgan"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Corporate Email" required htmlFor="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control text-xs"
                  placeholder="e.g. alex.morgan@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </FormField>

              <FormField label="Contact Phone" htmlFor="phone">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control text-xs"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Assigned Department" required htmlFor="departmentId">
              <select
                id="departmentId"
                name="departmentId"
                className="form-control text-xs"
                value={formData.departmentId}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Designation / Role" htmlFor="designation">
                <input
                  id="designation"
                  name="designation"
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Lead Engineer"
                  value={formData.designation}
                  onChange={handleChange}
                />
              </FormField>

              <FormField label="Commencement / Joining Date" htmlFor="joiningDate">
                <input
                  id="joiningDate"
                  name="joiningDate"
                  type="date"
                  className="form-control text-xs"
                  value={formData.joiningDate}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <div className="modal-actions pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Saving Record...'
                  : editEmp
                  ? 'Update Profile'
                  : 'Register Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog (HR_ADMIN only) */}
      {isHrAdmin && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete Employee Record"
          message={
            deleteTarget
              ? `Are you sure you want to permanently delete employee "${deleteTarget.name}" (${deleteTarget.employeeId})? This operation requires zero active dependencies.`
              : ''
          }
          confirmText="Delete Record"
          confirmVariant="danger"
          loading={actionLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default Employees;
