import React from 'react';
import { IconCheck, IconX, IconBan, IconAlertCircle } from './Icons';

function StatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();

  const getStatusConfig = () => {
    switch (normalized) {
      case 'PENDING':
        return {
          className: 'badge-pending',
          icon: <span className="status-dot status-dot-pending" aria-hidden="true" />,
          label: 'Pending',
        };
      case 'APPROVED':
        return {
          className: 'badge-approved',
          icon: <IconCheck size={12} className="status-badge-icon" />,
          label: 'Approved',
        };
      case 'REJECTED':
        return {
          className: 'badge-rejected',
          icon: <IconX size={12} className="status-badge-icon" />,
          label: 'Rejected',
        };
      case 'CANCELLED':
        return {
          className: 'badge-cancelled',
          icon: <IconBan size={12} className="status-badge-icon" />,
          label: 'Cancelled',
        };
      case 'ACTIVE':
        return {
          className: 'badge-approved',
          icon: <span className="status-dot status-dot-approved" aria-hidden="true" />,
          label: 'Active',
        };
      case 'INACTIVE':
        return {
          className: 'badge-neutral',
          icon: <span className="status-dot status-dot-cancelled" aria-hidden="true" />,
          label: 'Inactive',
        };
      case 'AVAILABLE':
        return {
          className: 'badge-approved',
          icon: <span className="status-dot status-dot-approved" aria-hidden="true" />,
          label: 'Available',
        };
      case 'CONFLICT':
        return {
          className: 'badge-rejected',
          icon: <IconAlertCircle size={12} className="status-badge-icon" />,
          label: 'Conflict',
        };
      case 'WARNING':
        return {
          className: 'badge-pending',
          icon: <IconAlertCircle size={12} className="status-badge-icon" />,
          label: 'Warning',
        };
      default:
        return {
          className: 'badge-neutral',
          icon: null,
          label: normalized || 'Unknown',
        };
    }
  };

  const { className, icon, label } = getStatusConfig();

  return (
    <span className={`status-badge ${className}`} role="status">
      {icon}
      <span>{label}</span>
    </span>
  );
}

export default StatusBadge;
