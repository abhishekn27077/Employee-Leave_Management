import React, { useEffect, useState } from 'react';
import { holidayApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  IconCalendar,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconEdit,
  IconTrash,
} from '../components/Icons';

function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    holidayDate: '',
    description: '',
  });

  // Delete Confirm Dialog State
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    holiday: null,
  });

  const fetchHolidays = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await holidayApi.getAll();
      setHolidays(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const openCreateModal = () => {
    setEditingHoliday(null);
    setFormData({
      name: '',
      holidayDate: new Date().toISOString().split('T')[0],
      description: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (h) => {
    setEditingHoliday(h);
    setFormData({
      name: h.name,
      holidayDate: h.holidayDate,
      description: h.description || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!actionLoading) {
      setModalOpen(false);
      setEditingHoliday(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingHoliday) {
        await holidayApi.update(editingHoliday.id, formData);
        setSuccess(`Holiday '${formData.name}' was updated successfully.`);
      } else {
        await holidayApi.create(formData);
        setSuccess(`Holiday '${formData.name}' on ${formData.holidayDate} was created.`);
      }
      closeModal();
      fetchHolidays();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = (h) => {
    setDeleteConfirm({
      isOpen: true,
      holiday: h,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.holiday) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await holidayApi.delete(deleteConfirm.holiday.id);
      setSuccess(`Holiday '${deleteConfirm.holiday.name}' was deleted.`);
      setDeleteConfirm({ isOpen: false, holiday: null });
      fetchHolidays();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeleteConfirm({ isOpen: false, holiday: null });
    } finally {
      setActionLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingHolidays = holidays.filter((h) => h.holidayDate >= today);
  const pastHolidays = holidays.filter((h) => h.holidayDate < today);

  const filteredHolidays = holidays.filter((h) => {
    const term = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      (h.name || '').toLowerCase().includes(term) ||
      (h.holidayDate || '').includes(term) ||
      (h.description || '').toLowerCase().includes(term)
    );
  });

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="holidays-page">
      <PageHeader
        title="Official Holiday Calendar"
        subtitle="Manage statutory public holidays and corporate closures that automatically exempt employee leave balance deductions"
        badge={`${holidays.length} Holidays`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchHolidays}
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
              <span>Add Holiday</span>
            </button>
          </>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Calendar Holidays</span>
          <span className="stat-value">{holidays.length}</span>
          <span className="stat-helper">Statutory & corporate observances</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Upcoming Holidays</span>
          <span className="stat-value" style={{ color: 'var(--primary-color, #4f46e5)' }}>
            {upcomingHolidays.length}
          </span>
          <span className="stat-helper">Remaining in future schedule</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Past Observances</span>
          <span className="stat-value" style={{ color: 'var(--text-muted, #64748b)' }}>
            {pastHolidays.length}
          </span>
          <span className="stat-helper">Elapsed calendar events</span>
        </div>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <div className="search-input-wrapper">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by holiday name, date (YYYY-MM-DD), or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                &times;
              </button>
            )}
          </div>
          <span className="toolbar-count">
            Showing {filteredHolidays.length} of {holidays.length}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching holiday calendar..." />
        ) : filteredHolidays.length === 0 ? (
          <EmptyState
            icon={<IconCalendar size={36} className="text-muted" />}
            title={searchTerm ? 'No matching holidays found' : 'No holidays registered'}
            description={
              searchTerm
                ? `No holidays match "${searchTerm}".`
                : 'Add official statutory public holidays so leave requests automatically exempt these days.'
            }
            actionText={holidays.length === 0 ? 'Add First Holiday' : null}
            onAction={holidays.length === 0 ? openCreateModal : null}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ref #</th>
                  <th>Holiday Date</th>
                  <th>Holiday Name</th>
                  <th>Description / Notes</th>
                  <th>Timeline Status</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.map((h) => {
                  const isUpcoming = h.holidayDate >= today;
                  return (
                    <tr key={h.id}>
                      <td>
                        <span className="code-pill">#{h.id}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IconCalendar size={14} className="text-muted" />
                          <span style={{ fontWeight: 600 }}>{formatDisplayDate(h.holidayDate)}</span>
                          <span className="code-pill-sm">{h.holidayDate}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                          {h.name}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                          {h.description || '—'}
                        </span>
                      </td>
                      <td>
                        {isUpcoming ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Upcoming
                          </span>
                        ) : (
                          <span className="badge badge-secondary">
                            Elapsed
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="table-action-btns">
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => openEditModal(h)}
                            title="Edit holiday"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => confirmDelete(h)}
                            title="Delete holiday"
                          >
                            <IconTrash size={14} />
                          </button>
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingHoliday ? 'Edit Official Holiday' : 'Add Official Holiday'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
                disabled={actionLoading}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Holiday Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Independence Day, Diwali, Christmas"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Holiday Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.holidayDate}
                    onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Observance Details</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Optional notes regarding the corporate or national observance..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
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
                    : editingHoliday
                    ? 'Update Holiday'
                    : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Confirm Holiday Removal"
        message={`Are you sure you want to delete the holiday '${deleteConfirm.holiday?.name}' (${deleteConfirm.holiday?.holidayDate})? Leave requests spanning this date will no longer exempt it from balance deductions.`}
        confirmText="Delete Holiday"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, holiday: null })}
      />
    </div>
  );
}

export default Holidays;
