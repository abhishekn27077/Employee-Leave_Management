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
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Avatar from '../components/Avatar';
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
        // Manager workspace: load team members, department availability, and department leaves
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
        // HR_ADMIN or general workforce directory
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
    if (!formData.employeeId.trim() || !formData.name.trim() || !formData.email.trim() || !formData.departmentId) {
      setError('Please fill in all mandatory fields: Employee ID, Name, Email, and Department.');
      return;
    }

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
      departmentId: Number(formData.departmentId),
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

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !deptFilter || String(emp.department?.id) === deptFilter;

    return matchesSearch && matchesDept;
  });

  // Manager helpers for availability and upcoming leave
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

  // Status badge styling helper
  const getLeaveStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="status-badge status-approved">Approved</span>;
      case 'PENDING':
        return <span className="status-badge status-pending">Pending</span>;
      case 'REJECTED':
        return <span className="status-badge status-rejected">Rejected</span>;
      case 'CANCELLED':
        return <span className="status-badge status-cancelled">Cancelled</span>;
      default:
        return <span className="status-badge status-draft">{status}</span>;
    }
  };

  return (
    <div className="employees-page">
      <PageHeader
        title={isManager ? 'My Team' : 'Employee Directory'}
        subtitle={
          isManager
            ? `Department Team Workspace • ${user?.departmentName || 'Your Department'}`
            : 'Corporate workforce directory, departmental reporting relationships & profile records'
        }
        badge={
          isManager
            ? `${employees.length} Team Members`
            : `${employees.length} Staff`
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchData}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
            {isManager && (
              <>
                <Link to="/availability" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <IconCalendar size={16} />
                  <span>Team Availability</span>
                </Link>
                <Link to="/leaves?scope=approvals" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <IconClock size={16} />
                  <span>Leave Approvals</span>
                </Link>
              </>
            )}
            {isHrAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateModal}
                disabled={departments.length === 0}
                title={departments.length === 0 ? 'Create a department first' : ''}
              >
                <IconPlus size={16} />
                <span>Register Employee</span>
              </button>
            )}
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Manager Team Availability Metrics Card */}
      {isManager && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div className="content-card" style={{ padding: '1.125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Department Staff
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {teamAvailability?.totalEmployees ?? employees.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>
              Assigned to {user?.departmentName || 'Department'}
            </span>
          </div>

          <div className="content-card" style={{ padding: '1.125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#047857', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Present &amp; Available Today
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>
              {teamAvailability?.availableCount ?? (employees.length - (teamAvailability?.onLeaveCount || 0))}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#059669' }}>
              Actively on duty
            </span>
          </div>

          <div className="content-card" style={{ padding: '1.125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              On Approved Leave Today
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', marginTop: '0.25rem' }}>
              {teamAvailability?.onLeaveCount ?? 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
              Out of office
            </span>
          </div>

          <div className="content-card" style={{ padding: '1.125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Team Availability Rate
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
              {teamAvailability?.availabilityPercentage != null
                ? `${Math.round(teamAvailability.availabilityPercentage)}%`
                : '100%'}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
              Real-time calculation
            </span>
          </div>
        </div>
      )}

      {/* Scope banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.625rem 1rem',
          backgroundColor: isManager ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${isManager ? '#bbf7d0' : '#e2e8f0'}`,
          borderRadius: '0.625rem',
          marginBottom: '1.25rem',
          fontSize: '0.8125rem',
          color: isManager ? '#166534' : '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{isManager ? '🛡️' : '🌐'}</span>
          <span>
            <strong>Scope:</strong>{' '}
            {isManager
              ? `Department Team Scope — Backend strictly limits view to ${user?.departmentName || 'your department'}.`
              : 'Organization-wide Directory — HR Administrator authority.'}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Date: {todayStr}
        </span>
      </div>

      {departments.length === 0 && !loading && isHrAdmin && (
        <div className="alert-banner alert-warning mb-4">
          <span>⚠️ No departments configured. You must create at least one department before registering employees.</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="content-card">
        <div className="card-toolbar card-toolbar-multi">
          <div className="search-input-wrapper">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={isManager ? "Search team members by name, ID, or designation..." : "Search by name, ID, designation, or email..."}
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

          <div className="toolbar-filter-group">
            {isHrAdmin && (
              <>
                <label htmlFor="deptFilter" className="sr-only">Filter by Department</label>
                <select
                  id="deptFilter"
                  className="toolbar-select"
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
              </>
            )}

            <span className="toolbar-count">
              Showing {filteredEmployees.length} of {employees.length}
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message={isManager ? "Loading team workspace..." : "Loading employee directory..."} />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<IconEmployees size={36} className="text-muted" />}
            title={searchTerm || deptFilter ? 'No matching team members' : 'No employees in this scope'}
            description={
              searchTerm || deptFilter
                ? 'No employee profiles match the chosen search or department filter. Try resetting filters.'
                : isManager
                ? 'No employees are currently assigned to your department.'
                : 'Get started by creating your first employee profile and linking them to a department.'
            }
            actionText={searchTerm || deptFilter || isManager ? null : 'Register First Employee'}
            onAction={searchTerm || deptFilter || isManager ? null : openCreateModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Staff ID</th>
                  <th>Employee Name &amp; Email</th>
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
                        <span className="code-pill code-pill-emp">{emp.employeeId}</span>
                      </td>
                      <td>
                        <div className="employee-cell-avatar">
                          <Avatar name={emp.name} size={34} />
                          <div className="employee-info-cell">
                            <span className="employee-primary-name">{emp.name}</span>
                            <span className="employee-email">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      {isHrAdmin && (
                        <td>
                          <span className="dept-tag">
                            {emp.department?.name || 'Unassigned'}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className="designation-text">{emp.designation || 'Staff'}</span>
                      </td>

                      {isManager ? (
                        <>
                          <td>
                            {availability?.onLeave ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.375rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }}
                                title={availability.reason ? `Reason: ${availability.reason}` : 'On approved leave'}
                              >
                                <span>🏖️</span>
                                <span>On Leave: {availability.leaveType || 'Approved'}</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.375rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                <span>Available / Working</span>
                              </span>
                            )}
                          </td>
                          <td>
                            {upcomingLeave ? (
                              <div style={{ fontSize: '0.75rem', color: '#1e293b' }}>
                                <span style={{ fontWeight: 600, color: '#2563eb' }}>
                                  {upcomingLeave.leaveType?.name || 'Leave'}:
                                </span>{' '}
                                <span>{upcomingLeave.startDate} to {upcomingLeave.endDate}</span>{' '}
                                <span style={{ color: '#64748b' }}>({upcomingLeave.numberOfDays}d)</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                None scheduled
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="phone-text">{emp.phone || '—'}</span>
                          </td>
                          <td>
                            <div className="date-cell">
                              <IconCalendar size={13} className="text-muted" />
                              <span>{emp.joiningDate || '—'}</span>
                            </div>
                          </td>
                        </>
                      )}

                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-action btn-action-view"
                            onClick={() => openDetailModal(emp)}
                            title="View complete employee profile & leave summary"
                          >
                            <IconInfo size={14} />
                            <span>Details</span>
                          </button>

                          {isHrAdmin && (
                            <>
                              <button
                                type="button"
                                className="btn-action btn-action-edit"
                                onClick={() => openEditModal(emp)}
                                title="Edit employee record"
                              >
                                <IconEdit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-action btn-action-delete"
                                onClick={() => setDeleteTarget(emp)}
                                title="Delete employee record"
                              >
                                <IconTrash size={14} />
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

      {/* ========================================================= */}
      {/* 5. HR_ADMIN & MANAGER — EMPLOYEE DETAIL INSPECTOR MODAL   */}
      {/* ========================================================= */}
      <Modal
        isOpen={!!detailTarget}
        title="Employee Overview &amp; Leave Profile"
        subtitle={detailTarget ? `${detailTarget.name} (${detailTarget.employeeId}) • ${detailTarget.department?.name || 'Department'}` : ''}
        onClose={closeDetailModal}
        maxWidth="800px"
      >
        {detailTarget && (
          <div>
            <AlertMessage type="error" message={detailError} onClose={() => setDetailError('')} />

            {/* 1. EMPLOYEE OVERVIEW */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1.25rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                marginBottom: '1.5rem',
              }}
            >
              <Avatar name={detailTarget.name} size="lg" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {detailTarget.name}
                  </h3>
                  <span className="code-pill code-pill-emp">{detailTarget.employeeId}</span>
                  <span className="dept-tag">{detailTarget.department?.name || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem 1rem', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Designation: </span>
                    <strong style={{ color: '#1e293b' }}>{detailTarget.designation || 'Staff'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Email: </span>
                    <strong style={{ color: '#1e293b', wordBreak: 'break-all' }}>{detailTarget.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phone: </span>
                    <strong style={{ color: '#1e293b' }}>{detailTarget.phone || 'Not Provided'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Joining Date: </span>
                    <strong style={{ color: '#1e293b' }}>{detailTarget.joiningDate || 'Not Specified'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Architectural Note regarding Model Fields */}
            <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#475569', marginBottom: '1.5rem' }}>
              ℹ️ <em>Reporting Manager &amp; Employment Status:</em> Not currently represented in the existing Employee model.
            </div>

            {detailLoading ? (
              <LoadingSpinner message="Retrieving employee leave balances and history..." />
            ) : (
              <>
                {/* 2. LEAVE SUMMARY */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Leave Balances Summary
                  </h4>

                  {detailBalances.length === 0 ? (
                    <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.8125rem', color: '#64748b' }}>
                      No leave balance allocations recorded for this employee yet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                        <thead>
                          <tr>
                            <th>Leave Type</th>
                            <th style={{ textAlign: 'center' }}>Total Entitlement</th>
                            <th style={{ textAlign: 'center' }}>Used Days</th>
                            <th style={{ textAlign: 'center' }}>Remaining Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailBalances.map((bal) => (
                            <tr key={bal.id}>
                              <td>
                                <strong>{bal.leaveType?.name || 'Leave'}</strong>
                              </td>
                              <td style={{ textAlign: 'center' }}>{bal.entitlement} days</td>
                              <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 600 }}>{bal.used} days</td>
                              <td style={{ textAlign: 'center', color: '#047857', fontWeight: 700 }}>{bal.balance} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. LEAVE HISTORY */}
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Leave Application History ({detailLeaves.length})
                  </h4>

                  {detailLeaves.length === 0 ? (
                    <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.8125rem', color: '#64748b' }}>
                      No leave requests submitted by this employee.
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Dates</th>
                            <th style={{ textAlign: 'center' }}>Days</th>
                            <th>Status</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailLeaves.map((leave) => (
                            <tr key={leave.id}>
                              <td>
                                <strong>{leave.leaveType?.name || 'Leave'}</strong>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.75rem' }}>
                                  {leave.startDate} to {leave.endDate}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                {leave.numberOfDays}
                              </td>
                              <td>{getLeaveStatusBadge(leave.status)}</td>
                              <td>
                                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
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

            <div className="modal-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={closeDetailModal}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* Employee Create / Edit Modal (HR_ADMIN only)              */}
      {/* ========================================================= */}
      {isHrAdmin && (
        <Modal
          isOpen={isModalOpen}
          title={editEmp ? 'Edit Employee Profile' : 'Register New Employee'}
          subtitle={editEmp ? `Updating record for ${editEmp.name} (${editEmp.employeeId})` : 'Create employee record with departmental assignment'}
          onClose={closeModal}
          maxWidth="620px"
        >
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group mb-3">
                <label className="form-label" htmlFor="employeeId">
                  Employee ID <span className="text-danger">*</span>
                </label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  className="form-control"
                  placeholder="e.g. EMP100"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label" htmlFor="name">
                  Full Legal Name <span className="text-danger">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group mb-3">
                <label className="form-label" htmlFor="email">
                  Corporate Email <span className="text-danger">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="e.g. jane.doe@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label" htmlFor="departmentId">
                Assigned Department <span className="text-danger">*</span>
              </label>
              <select
                id="departmentId"
                name="departmentId"
                className="form-control"
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
            </div>

            <div className="form-grid-2">
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="designation">
                  Designation / Job Title
                </label>
                <input
                  id="designation"
                  name="designation"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Senior Software Engineer"
                  value={formData.designation}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="joiningDate">
                  Joining Date
                </label>
                <input
                  id="joiningDate"
                  name="joiningDate"
                  type="date"
                  className="form-control"
                  value={formData.joiningDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Saving Record...'
                  : editEmp
                  ? 'Update Employee'
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
              ? `Are you sure you want to permanently remove employee "${deleteTarget.name}" (${deleteTarget.employeeId})? Any past leave history associated with this employee will be evaluated against database integrity rules.`
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
