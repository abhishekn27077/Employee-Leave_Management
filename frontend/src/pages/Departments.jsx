import React, { useEffect, useState } from 'react';
import { departmentApi, extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import {
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
    <div className="departments-page space-y-6">
      <PageHeader
        title="Department Directory"
        subtitle="Manage organizational structure, business units, and departmental hierarchies."
        badge={`${departments.length} Units`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchDepartments}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateModal}
            >
              <IconPlus size={14} />
              <span>Add Department</span>
            </button>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Search and Table Card */}
      <div className="card-modern">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="search-input-wrapper flex-1 min-w-[240px]">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="search-input text-xs"
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
          <span className="text-xs text-muted font-mono">
            {filteredDepartments.length} of {departments.length} units
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={5} />
          </div>
        ) : filteredDepartments.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'No matching departments' : 'No departments configured'}
            description={
              searchTerm
                ? `No departments match "${searchTerm}".`
                : 'Create your first organizational unit to begin assigning employees and manager roles.'
            }
            actionText={searchTerm ? undefined : 'Add First Department'}
            onAction={searchTerm ? undefined : openCreateModal}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Department Name</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span className="font-mono text-xs text-muted">#{dept.id}</span>
                    </td>
                    <td>
                      <strong className="text-primary text-xs font-semibold">{dept.name}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                          onClick={() => openEditModal(dept)}
                          title="Edit department name"
                        >
                          <IconEdit size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm text-[11px] py-1 px-2"
                          onClick={() => setDeleteTarget(dept)}
                          title="Delete department"
                        >
                          <IconTrash size={12} />
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
        subtitle={editDept ? `Updating organizational unit #${editDept.id}` : 'Add a new organizational business unit'}
        onClose={closeModal}
        maxWidth="450px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Department Name" required htmlFor="deptName">
            <input
              id="deptName"
              type="text"
              className="form-control text-xs"
              placeholder="e.g. Engineering, Sales, Human Resources"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              required
              autoFocus
            />
          </FormField>

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
              {actionLoading ? 'Saving...' : editDept ? 'Update Department' : 'Create Department'}
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
            ? `Are you sure you want to delete "${deleteTarget.name}"? If there are employees assigned to this department, deletion will be blocked by database integrity rules.`
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
