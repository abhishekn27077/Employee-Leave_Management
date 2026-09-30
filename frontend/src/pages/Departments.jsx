import React, { useEffect, useState } from 'react';
import { departmentApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  IconDepartments,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconRefresh,
} from '../components/Icons';

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deptName, setDeptName] = useState('');

  // Delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditDept(null);
    setDeptName('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditDept(dept);
    setDeptName(dept.name);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditDept(null);
    setDeptName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) {
      setError('Department name cannot be blank.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editDept) {
        await departmentApi.update(editDept.id, { name: deptName.trim() });
        setSuccess(`Department '${deptName.trim()}' updated successfully!`);
      } else {
        await departmentApi.create({ name: deptName.trim() });
        setSuccess(`Department '${deptName.trim()}' created successfully!`);
      }
      closeModal();
      fetchDepartments();
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
      await departmentApi.delete(deleteTarget.id);
      setSuccess(`Department "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchDepartments();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDepartments = departments.filter((d) =>
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="departments-page">
      <PageHeader
        title="Department Directory"
        subtitle="Organize company structure, administrative divisions, and business units"
        badge={`${departments.length} Units`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchDepartments}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              <IconPlus size={16} />
              <span>Add Department</span>
            </button>
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Search and Table Card */}
      <div className="content-card">
        <div className="card-toolbar">
          <div className="search-input-wrapper">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Filter departments by name..."
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
          <span className="toolbar-count">
            Showing {filteredDepartments.length} of {departments.length}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching department directory..." />
        ) : filteredDepartments.length === 0 ? (
          <EmptyState
            icon={<IconDepartments size={36} className="text-muted" />}
            title={searchTerm ? 'No matching departments' : 'No departments configured yet'}
            description={
              searchTerm
                ? `No department name matches "${searchTerm}". Try another keyword or clear search.`
                : 'Define your first administrative department to begin assigning employees.'
            }
            actionText={searchTerm ? null : 'Add First Department'}
            onAction={searchTerm ? null : openCreateModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Dept ID</th>
                  <th>Department Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span className="code-pill">#{dept.id}</span>
                    </td>
                    <td>
                      <span className="department-name-text">{dept.name}</span>
                    </td>
                    <td>
                      <span className="status-badge badge-approved">Active</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-action btn-action-edit"
                          onClick={() => openEditModal(dept)}
                          title="Edit department name"
                        >
                          <IconEdit size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action btn-action-delete"
                          onClick={() => setDeleteTarget(dept)}
                          title="Delete department"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editDept ? 'Edit Department' : 'Create Department'}
        subtitle={editDept ? `Modify information for #${editDept.id}` : 'Add a new administrative division'}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="deptName">
              Department Name <span className="text-danger">*</span>
            </label>
            <input
              id="deptName"
              type="text"
              className="form-control"
              placeholder="e.g. Human Resources, Engineering, Finance"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              required
              autoFocus
            />
            <span className="form-help-text">
              Names must be unique and descriptive for employee assignments.
            </span>
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
                ? 'Saving...'
                : editDept
                ? 'Save Changes'
                : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Department"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete department "${deleteTarget.name}"? If any employees belong to this department, deletion will be blocked by system integrity rules.`
            : ''
        }
        confirmText="Delete Department"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Departments;
