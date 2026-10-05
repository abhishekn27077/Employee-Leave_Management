import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import HRAdminDashboard from './pages/HRAdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import Profile from './pages/Profile';
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

function RoleDashboardRedirect() {
  const { user } = useAuth();
  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }
  switch (user.role) {
    case 'EMPLOYEE':
      return <Navigate to="/employee/dashboard" replace />;
    case 'MANAGER':
      return <Navigate to="/manager/dashboard" replace />;
    case 'HR_ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/employee/dashboard" replace />;
  }
}

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

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main-wrapper">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="app-content-area">
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <span>Employee Leave Management System &bull; Enterprise HR Portal</span>
            <span className="footer-stack">Spring Boot 4 &bull; MySQL &bull; React 19</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Root redirect to specific role dashboard */}
              <Route path="/" element={<RoleDashboardRedirect />} />

              {/* Role-Specific Dashboards */}
              <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
                <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
                <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['HR_ADMIN']} />}>
                <Route path="/admin/dashboard" element={<HRAdminDashboard />} />
              </Route>

              {/* User Profile View (All Authenticated Roles) */}
              <Route path="/profile" element={<Profile />} />

              {/* Leave Management & Inquiry (All Authenticated Roles) */}
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/balances" element={<LeaveBalances />} />
              <Route path="/holidays" element={<Holidays />} />
              <Route path="/availability" element={<TeamAvailability />} />
              <Route path="/apply-leave" element={<ApplyLeave />} />

              {/* Manager & Admin Modules */}
              <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HR_ADMIN']} />}>
                <Route path="/employees" element={<Employees />} />
              </Route>

              {/* HR_ADMIN-only Administrative Modules */}
              <Route element={<ProtectedRoute allowedRoles={['HR_ADMIN']} />}>
                <Route path="/departments" element={<Departments />} />
                <Route path="/leave-types" element={<LeaveTypes />} />
                <Route path="/leave-policies" element={<LeaveBalances />} />
                <Route path="/adjustments" element={<LeaveAdjustments />} />
                <Route path="/audit" element={<AuditHistory />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
