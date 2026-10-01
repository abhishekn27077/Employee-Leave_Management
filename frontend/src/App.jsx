import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import LeaveTypes from './pages/LeaveTypes';
import Leaves from './pages/Leaves';
import ApplyLeave from './pages/ApplyLeave';
import LeaveBalances from './pages/LeaveBalances';
import Holidays from './pages/Holidays';
import TeamAvailability from './pages/TeamAvailability';
import LeaveAdjustments from './pages/LeaveAdjustments';
import AuditHistory from './pages/AuditHistory';

function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-text">The requested resource or page does not exist in the workforce portal.</p>
        <Link to="/" className="btn btn-primary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="app-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="app-main-wrapper">
          <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          <main className="app-content-area">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/leave-types" element={<LeaveTypes />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/balances" element={<LeaveBalances />} />
              <Route path="/adjustments" element={<LeaveAdjustments />} />
              <Route path="/audit" element={<AuditHistory />} />
              <Route path="/holidays" element={<Holidays />} />
              <Route path="/availability" element={<TeamAvailability />} />
              <Route path="/apply-leave" element={<ApplyLeave />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <footer className="app-footer">
            <div className="footer-content">
              <span>Employee Leave Management System &bull; Enterprise HR Portal</span>
              <span className="footer-stack">Spring Boot 4 &bull; MySQL &bull; React 19</span>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
