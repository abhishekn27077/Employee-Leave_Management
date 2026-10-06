import React, { useEffect, useState } from 'react';
import { auditHistoryApi, extractErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import {
  IconSearch,
  IconRefresh,
  IconCalendar,
  IconClock,
  IconShield,
  IconLeaves,
  IconX,
} from '../components/Icons';

export default function AuditHistory() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAudits = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (actionFilter) params.action = actionFilter;
      if (entityIdFilter.trim()) params.entityId = Number(entityIdFilter.trim());
      if (startDate) params.startDate = `${startDate}T00:00:00`;
      if (endDate) params.endDate = `${endDate}T23:59:59`;

      const res = await auditHistoryApi.getAll(params);
      setAudits(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [entityTypeFilter, actionFilter, entityIdFilter, startDate, endDate]);

  const handleResetFilters = () => {
    setEntityTypeFilter('');
    setActionFilter('');
    setEntityIdFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  // Client-side text filter for search box
  const filteredAudits = audits.filter((a) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const actor = (a.actor || '').toLowerCase();
    const action = (a.action || '').toLowerCase();
    const entity = (a.entityType || '').toLowerCase();
    const desc = (a.description || '').toLowerCase();
    const id = String(a.id);
    const entityId = String(a.entityId || '');

    return (
      actor.includes(term) ||
      action.includes(term) ||
      entity.includes(term) ||
      desc.includes(term) ||
      id.includes(term) ||
      entityId.includes(term)
    );
  });

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'LEAVE_APPROVED':
      case 'POLICY_CREATED':
        return 'status-badge badge-approved';
      case 'LEAVE_REJECTED':
      case 'POLICY_DELETED':
        return 'status-badge badge-rejected';
      case 'LEAVE_CANCELLED':
      case 'LEAVE_ADJUSTED':
        return 'status-badge badge-pending';
      case 'LEAVE_SUBMITTED':
      case 'POLICY_UPDATED':
      default:
        return 'status-badge badge-neutral';
    }
  };

  // Stats calculation
  const totalEvents = audits.length;
  const leaveEvents = audits.filter((a) => a.entityType === 'LEAVE').length;
  const adminEvents = audits.filter((a) => a.entityType !== 'LEAVE').length;

  return (
    <div className="audit-history-page">
      <PageHeader
        title="Audit History"
        subtitle="Immutable system-wide ledger of leave lifecycles, adjustments, and policy operations"
        badge={`${audits.length} Records`}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchAudits}
            disabled={loading}
          >
            <IconRefresh size={16} />
            <span>Refresh</span>
          </button>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* KPI Stats - Compact SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        <StatCard
          label="Total Logged Events"
          value={totalEvents}
          unit="events"
          subtext="System operations in immutable ledger"
          icon={<IconClock size={16} />}
          tone="primary"
        />
        <StatCard
          label="Leave Lifecycle Events"
          value={leaveEvents}
          unit="events"
          subtext="Submissions, approvals & cancellations"
          icon={<IconLeaves size={16} />}
          tone="primary"
        />
        <StatCard
          label="Admin & Policy Events"
          value={adminEvents}
          unit="events"
          subtext="Adjustments & policy modifications"
          icon={<IconShield size={16} />}
          tone="slate"
        />
      </div>

      {/* Filter and Table Content Card */}
      <div className="card-modern">
        <div className="search-filter-toolbar" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Search Box */}
            <div className="search-input-wrapper" style={{ flex: '1 1 240px' }}>
              <IconSearch size={16} className="search-icon" />
              <input
                id="auditSearch"
                name="searchTerm"
                aria-label="Search audit events"
                type="text"
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search actor, description, action..."
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* Entity Type Filter */}
            <select
              id="auditEntityType"
              name="entityTypeFilter"
              aria-label="Filter by Entity Type"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="">All Entities</option>
              <option value="LEAVE">Leave</option>
              <option value="LEAVE_ADJUSTMENT">Leave Adjustment</option>
              <option value="LEAVE_POLICY">Leave Policy</option>
            </select>

            {/* Action Filter */}
            <select
              id="auditAction"
              name="actionFilter"
              aria-label="Filter by Action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="">All Actions</option>
              <option value="LEAVE_SUBMITTED">Leave Submitted</option>
              <option value="LEAVE_APPROVED">Leave Approved</option>
              <option value="LEAVE_REJECTED">Leave Rejected</option>
              <option value="LEAVE_CANCELLED">Leave Cancelled</option>
              <option value="LEAVE_ADJUSTED">Leave Adjusted</option>
              <option value="POLICY_CREATED">Policy Created</option>
              <option value="POLICY_UPDATED">Policy Updated</option>
              <option value="POLICY_DELETED">Policy Deleted</option>
            </select>

            {/* Entity ID */}
            <input
              id="auditEntityId"
              name="entityIdFilter"
              aria-label="Filter by Entity ID"
              type="number"
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              placeholder="Entity ID (e.g. 1)"
              className="form-control"
              style={{ width: '130px' }}
            />

            {/* Start Date */}
            <input
              id="auditStartDate"
              name="startDate"
              aria-label="Filter by Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
              title="Start Date"
            />

            {/* End Date */}
            <input
              id="auditEndDate"
              name="endDate"
              aria-label="Filter by End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
              title="End Date"
            />

            {(entityTypeFilter || actionFilter || entityIdFilter || startDate || endDate || searchTerm) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-muted, #64748b)' }}>
            <span>Showing {filteredAudits.length} of {audits.length} events</span>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div style={{ padding: '1rem' }}>
            <SkeletonLoader type="table" rows={6} />
          </div>
        ) : filteredAudits.length === 0 ? (
          <EmptyState
            icon={<IconClock size={36} className="text-muted" />}
            title="No Audit Records Found"
            description="No system audit events match the specified search or filter criteria."
          />
        ) : (
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Audit #</th>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Values / State Change</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="code-pill">#{a.id}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #475569)', whiteSpace: 'nowrap' }}>
                        {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="code-pill">
                        {a.actor || 'SYSTEM'}
                      </span>
                    </td>
                    <td>
                      <span className={getActionBadgeClass(a.action)}>
                        {a.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{a.entityType}</span>
                        <span className="code-pill" style={{ fontSize: '0.6875rem' }}>ID: {a.entityId}</span>
                      </div>
                    </td>
                    <td>
                      {a.oldValue || a.newValue ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                          {a.oldValue && (
                            <div style={{ color: 'var(--danger-color, #dc2626)' }}>
                              <span style={{ fontWeight: 600 }}>Old:</span> {a.oldValue}
                            </div>
                          )}
                          {a.newValue && (
                            <div style={{ color: 'var(--success-color, #16a34a)' }}>
                              <span style={{ fontWeight: 600 }}>New:</span> {a.newValue}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.8125rem' }} title={a.description}>
                        {a.description || '—'}
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
  );
}
