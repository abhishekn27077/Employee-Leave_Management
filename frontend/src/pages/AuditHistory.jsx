import React, { useEffect, useState } from 'react';
import { auditHistoryApi, extractErrorMessage } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  IconSearch,
  IconRefresh,
  IconCalendar,
  IconClock,
  IconInfo,
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

  const getActionBadge = (action) => {
    switch (action) {
      case 'LEAVE_APPROVED':
      case 'POLICY_CREATED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LEAVE_REJECTED':
      case 'POLICY_DELETED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LEAVE_CANCELLED':
      case 'LEAVE_ADJUSTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LEAVE_SUBMITTED':
      case 'POLICY_UPDATED':
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit History"
        description="Immutable system-wide ledger of leave lifecycles, adjustments, and policy operations"
        action={
          <button
            onClick={fetchAudits}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <IconRefresh size={16} />
            Refresh
          </button>
        }
      />

      <AlertMessage type="error" message={error} onClose={() => setError('')} />

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <IconSearch size={14} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search keyword..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Entities</option>
              <option value="LEAVE">Leave</option>
              <option value="LEAVE_ADJUSTMENT">Leave Adjustment</option>
              <option value="LEAVE_POLICY">Leave Policy</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
          </div>

          {/* Entity ID */}
          <div>
            <input
              type="number"
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              placeholder="Entity ID (e.g. 1)"
              className="w-full py-2 px-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-1.5 px-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-1.5 px-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              title="End Date"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(entityTypeFilter || actionFilter || entityIdFilter || startDate || endDate || searchTerm) && (
          <div className="flex justify-end">
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredAudits.length === 0 ? (
        <EmptyState
          title="No Audit Records"
          description="No system audit events match the specified criteria or actions have not yet occurred."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                  <th className="py-3.5 px-4">Audit ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Values / State Change</th>
                  <th className="py-3.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-500">#{a.id}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                      {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {a.actor || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getActionBadge(
                          a.action
                        )}`}
                      >
                        {a.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-gray-900">{a.entityType}</div>
                      <div className="text-xs font-mono text-gray-500">ID: {a.entityId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {a.oldValue || a.newValue ? (
                        <div className="space-y-0.5">
                          {a.oldValue && (
                            <div className="text-gray-500">
                              <span className="font-semibold text-rose-600">Old:</span> {a.oldValue}
                            </div>
                          )}
                          {a.newValue && (
                            <div className="text-gray-900">
                              <span className="font-semibold text-emerald-600">New:</span> {a.newValue}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-700 max-w-sm" title={a.description}>
                      {a.description || <span className="text-gray-400 italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
