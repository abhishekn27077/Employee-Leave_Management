import React from 'react';

function PageHeader({ title, subtitle, description, badge, actions, action, children }) {
  const displaySubtitle = subtitle || description;
  const displayActions = actions || action;

  return (
    <div className="page-header">
      <div className="page-header-info">
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {badge && <span className="page-title-badge">{badge}</span>}
        </div>
        {displaySubtitle && <div className="page-subtitle">{displaySubtitle}</div>}
      </div>
      {displayActions && <div className="page-header-actions">{displayActions}</div>}
      {children}
    </div>
  );
}

export default PageHeader;
