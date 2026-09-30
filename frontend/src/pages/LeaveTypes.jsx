import React, { useEffect, useState } from 'react';
import { leaveTypeApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  IconLeaveTypes,
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
      setError('Leave type policy name cannot be blank.');
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
        setSuccess(`Leave policy '${formData.name.trim()}' updated successfully!`);
      } else {
        await leaveTypeApi.create(payload);
        setSuccess(`New leave policy '${formData.name.trim()}' created successfully!`);
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
      setSuccess(`Leave policy "${deleteTarget.name}" deleted successfully.`);
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
    <div className="leave-types-page">
      <PageHeader
        title="Leave Policy Categories"
        subtitle="Configure company-wide time off classifications, entitlement days, and guidelines"
        badge={`${leaveTypes.length} Policies`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchLeaveTypes}
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
              <span>Configure Policy</span>
            </button>
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* Toolbar & Table */}
      <div className="content-card">
        <div className="card-toolbar">
          <div className="search-input-wrapper">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search policies by name or description..."
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
            Showing {filteredLeaveTypes.length} of {leaveTypes.length}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading policy categories..." />
        ) : filteredLeaveTypes.length === 0 ? (
          <EmptyState
            icon={<IconLeaveTypes size={36} className="text-muted" />}
            title={searchTerm ? 'No matching policies' : 'No leave policies configured yet'}
            description={
              searchTerm
                ? `No leave policy matches "${searchTerm}". Try another search term.`
                : 'Create policy categories like Annual Leave, Sick Leave, or Maternity/Paternity to enable employee applications.'
            }
            actionText={searchTerm ? null : 'Create First Policy'}
            onAction={searchTerm ? null : openCreateModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Policy ID</th>
                  <th>Policy Title</th>
                  <th style={{ width: '160px' }}>Default Quota</th>
                  <th>Description / Guidelines</th>
                  <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaveTypes.map((lt) => (
                  <tr key={lt.id}>
                    <td>
                      <span className="code-pill">#{lt.id}</span>
                    </td>
                    <td>
                      <span className="policy-name-text">{lt.name}</span>
                    </td>
                    <td>
                      <span className="quota-badge">
                        <strong>{lt.defaultDays}</strong> Days / Year
                      </span>
                    </td>
                    <td>
                      <span className="policy-desc-text">
                        {lt.description || <span className="text-muted italic">No guideline provided</span>}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-action btn-action-edit"
                          onClick={() => openEditModal(lt)}
                          title="Edit policy settings"
                        >
                          <IconEdit size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action btn-action-delete"
                          onClick={() => setDeleteTarget(lt)}
                          title="Delete policy"
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

      {/* Leave Type Form Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editType ? 'Edit Leave Policy' : 'Configure Leave Policy'}
        subtitle={editType ? `Editing configuration for #${editType.id}` : 'Define new time-off category and annual entitlement rules'}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="name">
              Policy Category Name <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-control"
              placeholder="e.g. Paid Annual Vacation, Sick Leave, Bereavement"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="defaultDays">
              Annual Entitlement (Days) <span className="text-danger">*</span>
            </label>
            <input
              id="defaultDays"
              name="defaultDays"
              type="number"
              min="1"
              max="365"
              className="form-control"
              placeholder="e.g. 14"
              value={formData.defaultDays}
              onChange={handleChange}
              required
            />
            <span className="form-help-text">Standard number of days allocated annually per employee.</span>
          </div>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="description">
              Policy Description & Guidelines
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="form-control"
              placeholder="Brief summary of when this policy applies, advance notice requirements, etc."
              value={formData.description}
              onChange={handleChange}
            />
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
                ? 'Saving Policy...'
                : editType
                ? 'Update Policy'
                : 'Save Policy'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Leave Policy"
        message={
          deleteTarget
            ? `Are you sure you want to remove leave policy "${deleteTarget.name}"? If any employee applications are currently filed under this category, the deletion will be blocked by system integrity constraints.`
            : ''
        }
        confirmText="Delete Policy"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default LeaveTypes;
