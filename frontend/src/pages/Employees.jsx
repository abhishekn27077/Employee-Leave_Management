import React, { useEffect, useState } from 'react';
import { employeeApi, departmentApi, extractErrorMessage } from '../services/api';
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
} from '../components/Icons';

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form modal
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

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, deptRes] = await Promise.all([
        employeeApi.getAll(),
        departmentApi.getAll(),
      ]);
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !deptFilter || String(emp.department?.id) === deptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="employees-page">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage workforce credentials, corporate assignments, and employee records"
        badge={`${employees.length} Staff`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchData}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
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
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {departments.length === 0 && !loading && (
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
              placeholder="Search by name, ID, designation, or email..."
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

            <span className="toolbar-count">
              Showing {filteredEmployees.length} of {employees.length}
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading employee directory..." />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<IconEmployees size={36} className="text-muted" />}
            title={searchTerm || deptFilter ? 'No matching employees' : 'No employees registered yet'}
            description={
              searchTerm || deptFilter
                ? 'No employee profiles match the chosen search or department filter. Try resetting filters.'
                : 'Get started by creating your first employee profile and linking them to a department.'
            }
            actionText={searchTerm || deptFilter ? null : 'Register First Employee'}
            onAction={searchTerm || deptFilter ? null : openCreateModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Staff ID</th>
                  <th>Employee Name & Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Contact</th>
                  <th>Joining Date</th>
                  <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
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
                    <td>
                      <span className="dept-tag">
                        {emp.department?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className="designation-text">{emp.designation || 'Staff'}</span>
                    </td>
                    <td>
                      <span className="phone-text">{emp.phone || '—'}</span>
                    </td>
                    <td>
                      <div className="date-cell">
                        <IconCalendar size={13} className="text-muted" />
                        <span>{emp.joiningDate || '—'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Create / Edit Modal */}
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

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}

export default Employees;
