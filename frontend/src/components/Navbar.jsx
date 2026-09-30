import React from 'react';
import { NavLink, Link } from 'react-router-dom';

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🏢</span>
          <span className="brand-text">LeaveTrack <small className="badge-pro">System</small></span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} end>
            Dashboard
          </NavLink>
          <NavLink to="/departments" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Departments
          </NavLink>
          <NavLink to="/employees" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Employees
          </NavLink>
          <NavLink to="/leave-types" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Leave Types
          </NavLink>
          <NavLink to="/leaves" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} end>
            All Leaves
          </NavLink>
          <NavLink to="/apply-leave" className={({ isActive }) => (isActive ? 'nav-item active btn-apply' : 'nav-item btn-apply')}>
            + Apply Leave
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
