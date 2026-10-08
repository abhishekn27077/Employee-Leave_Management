import React, { useEffect, useState } from 'react';
import { leaveTypeApi, extractErrorMessage } from '../services/api';
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

function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editType, setEditType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    defaultDays: '10',
    description: '',
  });

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchLeaveTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await leaveTypeApi.getAll();
      setLeaveTypes(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const openCreateModal = () => {
    setEditType(null);
    setFormData({ name: '', defaultDays: '10', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (lt) => {
    setEditType(lt);
    setFormData({
      name: lt.name || '',
      defaultDays: lt.defaultDays !== null && lt.defaultDays !== undefined ? String(lt.defaultDays) : '10',
      description: lt.description || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditType(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Leave category name cannot be blank.');
      return;
    }
    const days = parseInt(formData.defaultDays, 10);
    if (isNaN(days) || days <= 0) {
      setError('Default days allocation must be a positive integer greater than zero.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      name: formData.name.trim(),
      defaultDays: days,
      description: formData.description.trim() || null,
    };

    try {
      if (editType) {
        await leaveTypeApi.update(editType.id, payload);
        setSuccess(`Leave category '${formData.name.trim()}' updated successfully!`);
      } else {
        await leaveTypeApi.create(payload);
        setSuccess(`New leave category '${formData.name.trim()}' created successfully!`);
      }
      closeModal();
      fetchLeaveTypes();
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
      await leaveTypeApi.delete(deleteTarget.id);
      setSuccess(`Leave category "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchLeaveTypes();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeaveTypes = leaveTypes.filter((lt) =>
    (lt.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lt.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="leave-types-page space-y-6">
      <PageHeader
        title="Leave Categories"
        subtitle="Manage company-wide time off classifications, baseline annual days, and purpose descriptions."
        badge={`${leaveTypes.length} Categories`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchLeaveTypes}
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
              <span>Add Category</span>
            </button>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Toolbar & Table */}
      <div className="card-modern">
        <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="search-input-wrapper flex-1 min-w-[240px]">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="search-input text-xs"
              placeholder="Filter leave categories..."
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
            {filteredLeaveTypes.length} of {leaveTypes.length} categories
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={5} />
          </div>
        ) : filteredLeaveTypes.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'No matching leave categories' : 'No leave categories configured'}
            description={
              searchTerm
                ? `No leave categories match "${searchTerm}".`
                : 'Configure standard leave categories such as Annual Leave, Sick Leave, or Parental Leave.'
            }
            actionText={searchTerm ? undefined : 'Add First Category'}
            onAction={searchTerm ? undefined : openCreateModal}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Category Name</th>
                  <th>Default Annual Allowance</th>
                  <th>Description / Policy Notes</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaveTypes.map((lt) => (
                  <tr key={lt.id}>
                    <td>
                      <span className="font-mono text-xs text-muted">#{lt.id}</span>
                    </td>
                    <td>
                      <strong className="text-primary text-xs font-semibold">{lt.name}</strong>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                        {lt.defaultDays} Days
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-secondary">{lt.description || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                          onClick={() => openEditModal(lt)}
                          title="Edit leave category"
                        >
                          <IconEdit size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm text-[11px] py-1 px-2"
                          onClick={() => setDeleteTarget(lt)}
                          title="Delete leave category"
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editType ? 'Edit Leave Category' : 'Create Leave Category'}
        subtitle={editType ? `Updating #${editType.id} (${editType.name})` : 'Register a new leave type with baseline allocation'}
        onClose={closeModal}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Category Name" required htmlFor="typeName">
            <input
              id="typeName"
              name="name"
              type="text"
              className="form-control text-xs"
              placeholder="e.g. Annual Leave, Medical Leave"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </FormField>

          <FormField
            label="Default Annual Allowance (Days)"
            required
            htmlFor="typeDays"
            hint="Baseline entitlement allocated to employees when assigned this leave category."
          >
            <input
              id="typeDays"
              name="defaultDays"
              type="number"
              min="1"
              className="form-control text-xs"
              placeholder="e.g. 15"
              value={formData.defaultDays}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Description / Guidelines" htmlFor="typeDesc">
            <textarea
              id="typeDesc"
              name="description"
              rows={3}
              className="form-control text-xs"
              placeholder="Guidelines, documentation requirements, or policies for this category..."
              value={formData.description}
              onChange={handleChange}
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
              {actionLoading
                ? 'Saving...'
                : editType
                ? 'Update Category'
                : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Leave Category"
        message={
          deleteTarget
            ? `Are you sure you want to delete leave category "${deleteTarget.name}"? If there are active balances or leave records referencing this category, deletion will be rejected.`
            : ''
        }
        confirmText="Delete Category"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default LeaveTypes;
