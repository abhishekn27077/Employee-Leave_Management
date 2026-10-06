import React, { useEffect, useState } from 'react';
import { auditHistoryApi, extractErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import {
  IconSearch,
  IconRefresh,
  IconClock,
  IconShield,
  IconLeaves,
  IconX,
  IconCheck,
  IconBan,
  IconAlertCircle,
} from '../components/Icons';

export default function AuditHistory() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('ledger'); // 'ledger' | 'table'

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

  // Humanize action codes into professional labels
  const getActionDetails = (action) => {
    switch (action) {
      case 'LEAVE_APPROVED':
        return {
          title: 'Leave Approved',
          status: 'APPROVED',
          variant: 'approved',
          icon: <IconCheck size={14} />,
        };
      case 'LEAVE_REJECTED':
        return {
          title: 'Leave Rejected',
          status: 'REJECTED',
          variant: 'rejected',
          icon: <IconX size={14} />,
        };
      case 'LEAVE_CANCELLED':
        return {
          title: 'Leave Cancelled',
          status: 'CANCELLED',
          variant: 'neutral',
          icon: <IconBan size={14} />,
        };
      case 'LEAVE_SUBMITTED':
        return {
          title: 'Leave Submitted',
          status: 'PENDING',
          variant: 'pending',
          icon: <IconClock size={14} />,
        };
      case 'LEAVE_ADJUSTED':
        return {
          title: 'Balance Adjusted',
          status: 'PENDING',
          variant: 'pending',
          icon: <IconLeaves size={14} />,
        };
      case 'POLICY_CREATED':
        return {
          title: 'Leave Policy Created',
          status: 'APPROVED',
          variant: 'approved',
          icon: <IconShield size={14} />,
        };
      case 'POLICY_UPDATED':
        return {
          title: 'Leave Policy Updated',
          status: 'ACTIVE',
          variant: 'neutral',
          icon: <IconShield size={14} />,
        };
      case 'POLICY_DELETED':
        return {
          title: 'Leave Policy Deleted',
          status: 'REJECTED',
          variant: 'rejected',
          icon: <IconX size={14} />,
        };
      default:
        return {
          title: (action || 'System Event').replace(/_/g, ' '),
          status: 'ACTIVE',
          variant: 'neutral',
          icon: <IconShield size={14} />,
        };
    }
  };

  // Humanize actor identity
  const formatActor = (actor) => {
    if (!actor) return 'System Automated';
    const lower = actor.toLowerCase();
    if (lower === 'manager') return 'Manager';
    if (lower === 'admin') return 'HR Admin';
    if (lower === 'employee') return 'Employee';
    if (lower === 'system') return 'System Automated';
    return actor;
  };

  // Format timestamp to clean enterprise date
  const formatDateTime = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  // Stats calculation
  const totalEvents = audits.length;
  const leaveEvents = audits.filter((a) => a.entityType === 'LEAVE').length;
  const adminEvents = audits.filter((a) => a.entityType !== 'LEAVE').length;

  return (
    <div className="audit-history-page space-y-5">
      <PageHeader
        title="Audit History"
        subtitle="Immutable system-wide ledger of leave lifecycles, administrative adjustments, and policy modifications."
        badge={`${audits.length} Records`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded text-xs border" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-medium ${viewMode === 'ledger' ? 'bg-white text-primary shadow-xs' : 'text-muted'}`}
                onClick={() => setViewMode('ledger')}
              >
                Activity Ledger
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-medium ${viewMode === 'table' ? 'bg-white text-primary shadow-xs' : 'text-muted'}`}
                onClick={() => setViewMode('table')}
              >
                Data Table
              </button>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchAudits}
              disabled={loading}
            >
              <IconRefresh size={14} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* KPI Stats - Compact SaaS Proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
      <div className="card-modern p-4 space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Box */}
            <div className="search-input-field" style={{ minWidth: '220px' }}>
              <span className="search-icon-pos">
                <IconSearch size={15} />
              </span>
              <input
                id="auditSearch"
                name="searchTerm"
                aria-label="Search audit events"
                type="text"
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
              style={{ width: 'auto', minWidth: '140px', height: '36px' }}
            >
              <option value="">All Entities</option>
              <option value="LEAVE">Leave Request</option>
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
              style={{ width: 'auto', minWidth: '150px', height: '36px' }}
            >
              <option value="">All Actions</option>
              <option value="LEAVE_SUBMITTED">Leave Submitted</option>
              <option value="LEAVE_APPROVED">Leave Approved</option>
              <option value="LEAVE_REJECTED">Leave Rejected</option>
              <option value="LEAVE_CANCELLED">Leave Cancelled</option>
              <option value="LEAVE_ADJUSTED">Balance Adjusted</option>
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
              placeholder="Entity ID"
              className="form-control"
              style={{ width: '100px', height: '36px' }}
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
              style={{ width: 'auto', height: '36px' }}
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
              style={{ width: 'auto', height: '36px' }}
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

          <span className="text-xs text-muted font-medium whitespace-nowrap">
            Showing {filteredAudits.length} of {audits.length} events
          </span>
        </div>

        {/* Audit Log Content */}
        {loading ? (
          <div className="p-4">
            <SkeletonLoader variant="table" rows={6} />
          </div>
        ) : filteredAudits.length === 0 ? (
          <EmptyState
            icon={<IconClock size={36} className="text-muted" />}
            title="No Audit Records Found"
            description="No system audit events match the specified search or filter criteria."
          />
        ) : viewMode === 'ledger' ? (
          /* Human-Readable Activity Ledger */
          <div className="audit-list">
            {filteredAudits.map((a) => {
              const meta = getActionDetails(a.action);
              const actorLabel = formatActor(a.actor);

              return (
                <div key={a.id} className="audit-item-row">
                  <div className="audit-item-left">
                    <div className={`audit-avatar-icon ${meta.variant}`}>
                      {meta.icon}
                    </div>
                    <div className="audit-body">
                      <div className="audit-title-line">
                        <span className="audit-event-title">{meta.title}</span>
                        <StatusBadge status={meta.status} />
                        <span className="code-pill">#{a.id}</span>
                        <span className="text-muted text-xs">&bull;</span>
                        <span className="text-xs font-semibold text-secondary">
                          {a.entityType} ID: {a.entityId || 'N/A'}
                        </span>
                      </div>

                      <p className="audit-event-desc">
                        {a.description || 'System state modification recorded.'}
                      </p>

                      <div className="audit-meta-row">
                        <span>
                          Action by <strong className="text-primary font-medium">{actorLabel}</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="audit-time">
                          <IconClock size={12} />
                          {formatDateTime(a.timestamp)}
                        </span>

                        {(a.oldValue || a.newValue) && (
                          <>
                            <span>&bull;</span>
                            <span className="audit-state-pill">
                              {a.oldValue ? a.oldValue : 'INIT'} &rarr; {a.newValue ? a.newValue : 'NONE'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Tabular Data View */
          <div className="table-wrapper-modern">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '75px' }}>Log #</th>
                  <th>Event & Action</th>
                  <th>Context / Description</th>
                  <th>Actor</th>
                  <th>State Transition</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map((a) => {
                  const meta = getActionDetails(a.action);
                  const actorLabel = formatActor(a.actor);

                  return (
                    <tr key={a.id}>
                      <td>
                        <span className="code-pill">#{a.id}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`status-dot status-dot-${meta.variant}`} />
                          <div>
                            <div className="font-semibold text-primary text-xs">{meta.title}</div>
                            <span className="text-[11px] text-muted">{a.entityType} #{a.entityId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-secondary font-normal" title={a.description}>
                          {a.description || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="code-pill text-xs">
                          {actorLabel}
                        </span>
                      </td>
                      <td>
                        {a.oldValue || a.newValue ? (
                          <span className="audit-state-pill">
                            {a.oldValue || '—'} &rarr; {a.newValue || '—'}
                          </span>
                        ) : (
                          <span className="text-muted text-xs italic">Unmodified</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-muted whitespace-nowrap">
                          {formatDateTime(a.timestamp)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
