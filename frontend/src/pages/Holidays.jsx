import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { holidayApi, extractErrorMessage } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import {
  IconCalendar,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconCheckCircle,
} from '../components/Icons';

function Holidays() {
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN';

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
  const upcomingHolidays = holidays
    .filter((h) => h.holidayDate >= today)
    .sort((a, b) => (a.holidayDate || '').localeCompare(b.holidayDate || ''));
  const pastHolidays = holidays
    .filter((h) => h.holidayDate < today)
    .sort((a, b) => (b.holidayDate || '').localeCompare(a.holidayDate || ''));

  const filteredHolidays = holidays
    .filter((h) => {
      const term = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        (h.name || '').toLowerCase().includes(term) ||
        (h.holidayDate || '').includes(term) ||
        (h.description || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (a.holidayDate || '').localeCompare(b.holidayDate || ''));

  const formatDateDay = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatWeekday = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-GB', { weekday: 'long' });
    } catch {
      return '';
    }
  };

  return (
    <div className="holidays-page space-y-5">
      <PageHeader
        title="Official Holiday Calendar"
        subtitle={isHrAdmin ? "Manage statutory public holidays and corporate closures that automatically exempt employee leave balance deductions." : "View statutory public holidays and corporate closures that exempt leave deductions."}
        badge={`${holidays.length} Holidays`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchHolidays}
              disabled={loading || actionLoading}
            >
              <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {isHrAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openCreateModal}
              >
                <IconPlus size={14} />
                <span>Add Holiday</span>
              </button>
            )}
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* KPI Stats - Compact Enterprise Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Total Public Holidays"
          value={`${holidays.length} days`}
          subtext="Statutory and corporate closures"
          icon={<IconCalendar size={16} />}
          tone="primary"
        />

        <StatCard
          label="Upcoming Holidays"
          value={`${upcomingHolidays.length} days`}
          subtext={upcomingHolidays.length > 0 ? `Next on ${formatDateDay(upcomingHolidays[0]?.holidayDate)}` : "No future closures"}
          icon={<IconCheckCircle size={16} />}
          tone="emerald"
        />

        <StatCard
          label="Past Observances"
          value={`${pastHolidays.length} days`}
          subtext="Completed calendar observances"
          icon={<IconCalendar size={16} />}
          tone="slate"
        />
      </div>

      <div className="card-modern">
        <div className="p-3.5 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="search-input-wrapper flex-1 min-w-[240px]">
            <IconSearch size={14} className="search-icon" />
            <input
              type="text"
              className="search-input text-xs"
              placeholder="Search by holiday name, date (YYYY-MM-DD), or description..."
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
          <span className="text-xs text-muted font-mono">
            {filteredHolidays.length} of {holidays.length} holidays
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" count={5} />
          </div>
        ) : filteredHolidays.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'No matching holidays found' : 'No holidays registered'}
            description={
              searchTerm
                ? `No holidays match "${searchTerm}".`
                : 'Official statutory public holidays and corporate closures are listed here.'
            }
            actionText={holidays.length === 0 && isHrAdmin ? 'Add First Holiday' : undefined}
            onAction={holidays.length === 0 && isHrAdmin ? openCreateModal : undefined}
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ref #</th>
                  <th>Holiday Date</th>
                  <th>Holiday Name</th>
                  <th>Description / Policy Notes</th>
                  <th>Timeline Status</th>
                  {isHrAdmin && <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.map((h) => {
                  const isUpcoming = h.holidayDate >= today;
                  return (
                    <tr key={h.id}>
                      <td>
                        <span className="font-mono text-xs text-muted">#{h.id}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <IconCalendar size={15} className="text-muted flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-xs text-primary">
                              {formatDateDay(h.holidayDate)}
                            </div>
                            <div className="text-[11px] text-muted">
                              {formatWeekday(h.holidayDate)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="text-primary text-xs font-semibold">{h.name}</strong>
                      </td>
                      <td>
                        <span className="text-xs text-secondary">{h.description || '—'}</span>
                      </td>
                      <td>
                        {isUpcoming ? (
                          <StatusBadge status="ACTIVE" />
                        ) : (
                          <StatusBadge status="INACTIVE" />
                        )}
                      </td>
                      {isHrAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm text-[11px] py-1 px-2"
                              onClick={() => openEditModal(h)}
                              title="Edit holiday"
                            >
                              <IconEdit size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm text-[11px] py-1 px-2"
                              onClick={() => confirmDelete(h)}
                              title="Delete holiday"
                            >
                              <IconTrash size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Holiday Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        title={editingHoliday ? 'Edit Statutory Holiday' : 'Register Statutory Holiday'}
        subtitle={editingHoliday ? `Updating holiday #${editingHoliday.id}` : 'Exempts approved employee leave deductions on this date'}
        onClose={closeModal}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Holiday Name / Observance" required htmlFor="hName">
            <input
              id="hName"
              type="text"
              className="form-control text-xs"
              placeholder="e.g. Independence Day, New Year's Day"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </FormField>

          <FormField label="Holiday Calendar Date" required htmlFor="hDate">
            <input
              id="hDate"
              type="date"
              className="form-control text-xs"
              value={formData.holidayDate}
              onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Description / Statutory Authority (Optional)" htmlFor="hDesc">
            <textarea
              id="hDesc"
              className="form-control text-xs"
              rows={3}
              placeholder="e.g. Gazetted public holiday recognized nationwide..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              {actionLoading ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Save Holiday'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Holiday Record"
        message={
          deleteConfirm.holiday
            ? `Are you sure you want to remove '${deleteConfirm.holiday.name}' (${deleteConfirm.holiday.holidayDate})? Future leave conflict evaluations will no longer exempt this date.`
            : ''
        }
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
