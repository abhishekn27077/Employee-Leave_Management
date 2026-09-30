import React from 'react';

function PageHeader({ title, subtitle, badge, actions, children }) {
  return (
    <div className="page-header">
      <div className="page-header-info">
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {badge && <span className="page-title-badge">{badge}</span>}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
      {children}
    </div>
  );
}

export default PageHeader;
