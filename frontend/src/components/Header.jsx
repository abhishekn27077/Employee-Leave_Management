import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconMenu, IconPlus } from './Icons';

function Header({ onToggleSidebar }) {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Executive Overview';
      case '/departments':
        return 'Department Directory';
      case '/employees':
        return 'Employee Management';
      case '/leave-types':
        return 'Leave Policies';
      case '/leaves':
        return 'Leave Approval Queue';
      case '/apply-leave':
        return 'New Leave Request';
      default:
        return 'Workforce Portal';
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open sidebar navigation"
        >
          <IconMenu size={20} />
        </button>
        <div className="header-breadcrumb">
          <span className="breadcrumb-root">LeaveTrack</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{getPageTitle()}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="api-badge" title="Connected to Spring Boot API on port 8080">
          <span className="api-badge-dot"></span>
          <span className="api-badge-label">API Connected</span>
        </div>
        <Link to="/apply-leave" className="btn btn-primary btn-sm header-action-btn">
          <IconPlus size={15} />
          <span>Apply Leave</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
