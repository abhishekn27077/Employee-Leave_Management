# Screenshot Capture Plan

This plan documents the automated screenshot strategy for the Employee Leave Management System repository documentation and README.

## Global Specifications
- **Recommended Viewport**: 1440 × 900 (Desktop Presentation)
- **Quality**: High-resolution PNG, lossless
- **Target Directory**: `docs/screenshots/`
- **UI State**: Fully hydrated with demo seed data, no loading spinners, no debug overlays

---

## Planned Screenshots

### 1. Dashboard Overview
- **File**: `docs/screenshots/01-dashboard.png`
- **Route**: `/dashboard`
- **Role / Auth**: Manager (`manager` / `Manager@123`) or HR Admin (`admin` / `Admin@123`)
- **Purpose**: Main project preview showing enterprise KPI cards, quick actions, pending approvals queue, and workforce metrics.
- **Data Visible**: Key performance indicators (Total Employees, Pending Requests, Approved Leaves, Department Availability), recent leave activities, actionable approval items.
- **README Section**: Project Preview & Hero Showcase

### 2. Employee Directory
- **File**: `docs/screenshots/02-employees.png`
- **Route**: `/employees`
- **Role / Auth**: HR Admin (`admin` / `Admin@123`)
- **Purpose**: Showcase workforce directory, employee metadata, department mapping, and manager assignments.
- **Data Visible**: Filterable employee table with Employee Code, Full Name, Designation, Department, Manager, Joining Date, and Status badges.
- **README Section**: Key Features → Employee Management

### 3. Department Management
- **File**: `docs/screenshots/03-departments.png`
- **Route**: `/departments`
- **Role / Auth**: HR Admin (`admin` / `Admin@123`)
- **Purpose**: Display organizational units and department-level workforce structure.
- **Data Visible**: Department cards/table showing Department Name (Engineering, HR, Sales, Marketing), description, active headcount, and status.
- **README Section**: Key Features → Department Management

### 4. Leave Application & Conflict Engine
- **File**: `docs/screenshots/04-leave-application.png`
- **Route**: `/apply-leave`
- **Role / Auth**: Employee (`employee` / `Employee@123`)
- **Purpose**: Showcase employee self-service leave booking with dynamic conflict and policy validation.
- **Data Visible**: Leave Type selector, Start Date, End Date, Reason input, Live Balance Preview, and Policy Rules review panel.
- **README Section**: Key Features → Leave Application Workflow

### 5. Leave Tracking & History
- **File**: `docs/screenshots/05-leave-history.png`
- **Route**: `/leaves`
- **Role / Auth**: Employee (`employee` / `Employee@123`)
- **Purpose**: Display comprehensive leave request ledger with real-time status chips and cancellation options.
- **Data Visible**: Search filter bar, leave records with Leave Type, Date Range, Working Days count, Reason, Status badges (`Approved`, `Pending`, `Rejected`), and action triggers.
- **README Section**: Key Features → Leave History & Tracking

### 6. Manager Approval Workflow
- **File**: `docs/screenshots/06-leave-approval.png`
- **Route**: `/dashboard` (Pending Approvals section) or `/leaves?status=PENDING`
- **Role / Auth**: Manager (`manager` / `Manager@123`)
- **Purpose**: Highlight two-tier managerial review with immediate balance impact and audit trail.
- **Data Visible**: Pending team leave requests, applicant details, dates, conflict verification summary, Approve (Green) and Reject (Rose) action buttons.
- **README Section**: Key Features → Approval Workflow

### 7. Team Availability & Workforce Calendar
- **File**: `docs/screenshots/07-availability.png`
- **Route**: `/team-availability`
- **Role / Auth**: Manager (`manager` / `Manager@123`) or Employee (`employee` / `Employee@123`)
- **Purpose**: Showcase department staffing coverage, preventing scheduling overlap and operational understaffing.
- **Data Visible**: Department selector (e.g. Information Technology), monthly calendar grid, daily employee attendance/leave chips, and capacity indicators.
- **README Section**: Key Features → Workforce Availability
