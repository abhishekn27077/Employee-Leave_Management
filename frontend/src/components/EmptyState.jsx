import React from 'react';
import { IconPlus, IconSearch } from './Icons';

function EmptyState({
  icon,
  title = 'No records found',
  description = 'Get started by creating your first entry.',
  actionText,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon-wrapper">
        {icon || <IconSearch size={28} className="empty-state-icon" />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionText && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          <IconPlus size={16} />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}

export default EmptyState;
