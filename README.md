# Employee Leave Management System

A full-stack web application designed for managing organizational workforce availability, leave policies, approval workflows, balance tracking, and conflict detection.

---

## 1. Project Overview

Managing employee time off across departments often leads to scheduling conflicts, unmonitored policy breaches, and departmental understaffing. The **Employee Leave Management System** provides a centralized, automated platform that connects departmental rosters, holiday schedules, entitlement allowances, and leave approval workflows.

By calculating workforce availability and evaluating scheduling conflicts before leave approval, the system ensures operational continuity while maintaining transparent leave records.

### Scope Distinction

- **Core Functional Scope**: Department management, employee records, leave type definitions, leave policies, leave requests, leave balances, manager approvals/rejections, team availability forecasting, holiday calendars, balance adjustments, audit trails, and multi-rule conflict detection.
- **Implemented Product Enhancements**: Role-based access control (`EMPLOYEE`, `MANAGER`, `HR_ADMIN`), stateless JWT authentication, BCrypt password hashing, protected frontend routes, dedicated workspaces per role, and responsive UI design.

---

## 2. Authentication & Authorization

Authentication is implemented as a stateless, token-based security layer securing all backend APIs and frontend routes.

### Authentication Mechanism
- **Login (`POST /api/auth/login`)**: Accepts `usernameOrEmail` and `password`. Returns a signed JWT token along with user profile metadata.
- **Password Security**: Passwords are encrypted using Spring Security's `BCryptPasswordEncoder` with salt. No plaintext passwords or password hashes are ever exposed through API responses.
- **Current User Identity (`GET /api/auth/me`)**: Validates the Bearer token in the `Authorization` header and returns the authenticated user's ID, username, role, employee code, name, designation, and department.
- **Logout (`POST /api/auth/logout`)**: Stateless endpoint acknowledging session termination. The client discards the JWT token and clears cached user state from browser storage. (Stateless JWT authentication — no server-side token revocation or session store).
- **Protected Routes**: Frontend navigation is guarded by `ProtectedRoute.jsx`, redirecting unauthenticated visitors to `/login` and restricting pages based on the user's role.

### Role Model

The system enforces three distinct authorization roles:

1. **`EMPLOYEE`**:
   - Access to own profile and employment information.
   - Submits leave requests for self (cannot apply for other employees).
   - Views own leave request history and cancellation of own pending leaves.
   - Views own leave balances across leave types.
   - Views holiday calendar and team availability.

2. **`MANAGER`**:
   - Inherits all employee capabilities (can apply for and manage own leaves).
   - Views direct team members within their assigned department.
   - Reviews and approves or rejects pending leave requests for department members.
   - Accesses department-specific team availability and staffing metrics.
   - Restricted from organization-wide administrative settings.

3. **`HR_ADMIN`**:
   - Full organization-wide administration across all modules.
   - Manages employees, departments, leave types, and leave policies.
   - Manages holiday calendars and performs balance adjustments.
   - Views complete audit logs and company-wide workforce overview dashboard.

> **Important**: *Department* is an organizational attribute assigned to an employee and manager, not a security role. Managerial approval permissions are bound by the manager's department affiliation.

---

## 3. Key Modules

- **Authentication & Identity**: User authentication, JWT issuance, profile lookup, and role enforcement.
- **Employee Management**: Employee directory tracking ID, name, email, phone, designation, joining date, and department association.
- **Department Management**: Organizational structure with headcounts and minimum availability thresholds.
- **Leave Types & Policies**: Leave classifications (Annual, Sick, Casual, Maternity, Paternity, Unpaid) with configurable default allowances, consecutive day limits, and approval requirements.
- **Leave Balances**: Tracks individual allowances (`remainingBalance = entitlement - usedDays`).
- **Leave Requests & Workflow**: Application submission, date range calculation excluding holidays and weekends, and state progression (`PENDING` &rarr; `APPROVED` / `REJECTED` / `CANCELLED`).
- **Manager Approval Workspace**: Department-scoped approval queue with real-time conflict warnings.
- **Team Availability**: Real-time capacity calculations comparing present staff against minimum departmental thresholds.
- **Holiday Calendar**: Centralized calendar for company and public holidays that automatically reduces requested leave day counts.
- **Leave Adjustments**: Administrative adjustments to credit or debit days with required reference notes and audit logging.
- **Audit History**: Immutable audit log recording actors, actions, target entities, previous values, new values, and timestamps.
- **Workforce Dashboard**: Role-tailored dashboards for Employees, Managers, and HR Administrators.
- **Conflict Detection Engine**: Automated validation evaluating leave requests against 5 operational constraints.

---

## 4. Technology Stack

### Backend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Java** | 21 | Backend runtime environment |
| **Spring Boot** | 4.1.1 | Application framework and dependency injection |
| **Spring Data JPA** | Managed | Data access abstraction and repository layer |
| **Hibernate / JPA** | 7.4.5.Final | Object-Relational Mapping (ORM) and schema management |
| **Spring Security Crypto** | Managed | BCrypt password hashing |
| **Java Cryptography (`javax.crypto.Mac`)** | Standard (Java 21) | HMAC-SHA256 stateless JWT generation and verification with Jackson |
| **Jakarta Validation** | Managed | DTO bean validation constraints |
| **MySQL** | 8.0+ | Relational database storage (Connector/J 8.0.33) |
| **Apache Tomcat** | 11.0.24 | Embedded servlet container |

### Frontend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | 19.2.8 | UI component library |
| **Vite** | 8.3.0 | Frontend build tool and development server |
| **React Router DOM** | 7.18.4 | Declarative client-side routing and route guards |
| **Axios** | 1.20.0 | HTTP client for REST API communication |
| **Vanilla CSS Tokens** | Custom | Responsive design system using CSS custom properties |
| **Oxlint** | 1.81.0 | Frontend JavaScript/JSX linter |

### Testing & Tools
- **JUnit 5 / Mockito**: Backend unit and service test suites (146 automated tests).
- **Maven**: Build management and dependency resolution (`mvnw.cmd` wrapper included).
- **Node.js & npm**: Node 18+ and npm 9+ frontend runtime.

---

## 5. System Architecture

The application is structured as a single-repository client-server application:

```
React Frontend (Vite SPA)
       │
       ▼ (HTTP REST + JSON + JWT Bearer Header)
Spring Boot REST Controllers
       │
       ▼ (Security Filter & Jakarta Validation)
Service Layer (@Transactional, Conflict Engine, Business Rules)
       │
       ▼ (Spring Data JPA Repositories)
Data Layer (Hibernate ORM)
       │
       ▼ (ACID Transactions)
MySQL Database (InnoDB)
```

### Layer Responsibilities
- **Frontend SPA**: React components with `AuthContext` state management, Axios interceptors injecting JWT tokens, and CSS variables for styling.
- **REST Controllers**: Endpoints receiving DTOs, validating request constraints, delegating to services, and returning standard HTTP status codes.
- **Security Filter & Services**: Intercepts requests, validates JWT claims, and enforces role/ownership restrictions via `SecurityService`.
- **Service Layer**: Manages business logic, balance arithmetic, audit record creation, and transactional integrity (`@Transactional`).
- **Data Repositories**: Spring Data JPA interfaces executing queries against MySQL with entity relationships.

---

## 6. Project Structure

```
employee-leave-management/
├── pom.xml                               # Maven project definition and dependencies
├── mvnw / mvnw.cmd                       # Maven wrapper scripts
├── application-example.properties        # Example environment configuration template
├── src/
│   ├── main/
│   │   ├── java/com/example/employeeleave/
│   │   │   ├── EmployeeLeaveManagementApplication.java
│   │   │   ├── config/                   # WebSecurityConfig, AuthDataInitializer
│   │   │   ├── controller/               # 12 REST API Controllers
│   │   │   ├── dto/                      # Request/Response DTOs and Enums
│   │   │   ├── entity/                   # 9 Core Entities + UserAccount
│   │   │   ├── exception/                # GlobalExceptionHandler and Custom Exceptions
│   │   │   ├── repository/               # 10 Spring Data JPA Repositories
│   │   │   ├── security/                 # JwtTokenProvider, JwtAuthenticationFilter, SecurityService
│   │   │   └── service/                  # Business Services and LeaveConflictService
│   │   └── resources/
│   │       ├── application.properties    # Application configuration
│   │       └── application-example.properties
│   └── test/                             # 146 Automated unit and integration tests
└── frontend/
    ├── package.json                      # Frontend dependencies and scripts
    ├── vite.config.js                    # Vite configuration
    ├── index.html                        # HTML entry point
    └── src/
        ├── App.jsx                       # App routing, layout, and ProtectedRoute guards
        ├── index.css                     # Custom design tokens and styles
        ├── components/                   # Sidebar, Header, ProtectedRoute, AlertMessage, ConfirmDialog
        ├── context/                      # AuthContext for login/session state
        ├── pages/                        # Role dashboards, Leave workflows, Profile, Admin modules
        └── services/api.js               # Centralized Axios instance with auth interceptor
```

---

## 7. Database Entities & Relationships

The database schema consists of 10 JPA entities:

| Entity | Fields | Description |
| :--- | :--- | :--- |
| **`Department`** | `id`, `name` | Organizational units referenced by employees and policies. |
| **`Employee`** | `id`, `employeeId`, `name`, `email`, `phone`, `designation`, `joiningDate`, `department` | Individual employee profiles. |
| **`UserAccount`** | `id`, `username`, `email`, `passwordHash`, `role`, `active`, `employee`, `createdAt`, `lastLoginAt` | Authentication credentials linked to an employee. |
| **`LeaveType`** | `id`, `name`, `description`, `defaultDays` | Categories of leave (Annual, Sick, Casual, etc.). |
| **`LeavePolicy`** | `id`, `leaveType`, `department`, `entitlement`, `maxConsecutiveDays`, `requiresApproval`, `minAvailabilityPercentage` | Rules governing allowances and constraints. |
| **`LeaveBalance`** | `id`, `employee`, `leaveType`, `entitlement`, `usedDays`, `remainingBalance` | Employee leave tracking. |
| **`Leave`** | `id`, `employee`, `leaveType`, `startDate`, `endDate`, `status`, `reason`, `appliedAt` | Leave requests (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`). |
| **`Holiday`** | `id`, `holidayDate`, `name`, `description` | Official non-working calendar dates. |
| **`LeaveAdjustment`** | `id`, `employee`, `leaveType`, `adjustmentDays`, `reason`, `reference`, `createdAt` | Manual balance modifications by HR. |
| **`AuditHistory`** | `id`, `actor`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `description`, `timestamp` | Append-only audit events. |

### Relationships
- `Employee` &rarr; `Department`: `@ManyToOne` (Employee belongs to one department).
- `UserAccount` &rarr; `Employee`: `@OneToOne` (User account links to one employee).
- `Leave` &rarr; `Employee` & `LeaveType`: `@ManyToOne` (Request submitted by employee for a leave type).
- `LeaveBalance` &rarr; `Employee` & `LeaveType`: `@ManyToOne` with unique composite constraint.
- `LeavePolicy` &rarr; `LeaveType` (`@ManyToOne`) and optional `Department` (`@ManyToOne`).
- `LeaveAdjustment` &rarr; `Employee` & `LeaveType`: `@ManyToOne`.

---

## 8. Leave Workflow

```
[ Employee Logs In ]
         │
         ▼
[ Apply Leave Form (/apply-leave) ]
- Select Leave Type, Start Date, End Date, Reason
         │
         ▼
[ Real-Time Conflict Check (POST /api/leaves/evaluate-conflicts) ]
- Checks balance, public holidays, overlapping requests, and department availability
         │
         ▼
[ Submit Request (POST /api/leaves) ]
- Status: PENDING
- Audit log entry created
         │
         ▼
[ Manager Review (Approval Queue) ]
- Manager reviews request details, conflict warnings, and team capacity
         │
    ┌────┴──────────────────────────┐
    ▼                               ▼
[ Approve (PUT .../approve) ]     [ Reject (PUT .../reject) ]
- Status: APPROVED                - Status: REJECTED
- remainingBalance deducted       - Balance preserved
- usedDays incremented            - Audit log with rejection reason
- Audit log created               - Employee notified in UI
```

---

## 9. Conflict Detection Engine

The system evaluates 5 distinct conflict conditions during pre-submission checks and prior to approval:

1. **`INSUFFICIENT_BALANCE`** (*Blocking*): The requested working days exceed the employee's available remaining balance.
2. **`POLICY_VIOLATION`** (*Blocking*): Start date is after end date, duration exceeds the policy's `maxConsecutiveDays`, or date is in the past where restricted.
3. **`OVERLAPPING_LEAVE`** (*Blocking*): The employee already has an existing `PENDING` or `APPROVED` leave request overlapping the requested date range.
4. **`HOLIDAY_CONFLICT`** (*Informational / Warning*): Identifies public holidays falling within the selected dates; official holidays are excluded from consumed working days.
5. **`TEAM_AVAILABILITY_CONFLICT`** (*Warning / Blocking*): Approving the leave causes department staffing to drop below the configured `minAvailabilityPercentage`.

---

## 10. REST API Reference

### Authentication Endpoints
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user; returns JWT token and user details. |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user metadata. |
| `POST` | `/api/auth/logout` | Public / Authenticated | Acknowledges logout; client clears stored JWT and cached session. |

### Employee Endpoints
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Authenticated | Lists employees (HR: all; Manager: department; Employee: self). |
| `GET` | `/api/employees/{id}` | Authenticated | Retrieves employee by ID (scoped by role and department). |
| `POST` | `/api/employees` | HR_ADMIN | Creates a new employee record. |
| `PUT` | `/api/employees/{id}` | HR_ADMIN | Updates an employee record. |
| `DELETE` | `/api/employees/{id}` | HR_ADMIN | Deletes an employee record. |

### Department Endpoints
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | Authenticated | Lists all departments. |
| `GET` | `/api/departments/{id}` | Authenticated | Retrieves department details. |
| `POST` | `/api/departments` | HR_ADMIN | Creates a new department. |
| `PUT` | `/api/departments/{id}` | HR_ADMIN | Updates department details. |
| `DELETE` | `/api/departments/{id}` | HR_ADMIN | Deletes department (restricted if active staff exist). |

### Leave Request & Approval Endpoints
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/leaves` | Authenticated | Applies for leave (status initialized to `PENDING`). |
| `POST` | `/api/leaves/evaluate-conflicts` | Authenticated | Pre-evaluates candidate leave for conflicts. |
| `GET` | `/api/leaves` | Authenticated | Lists leaves (HR: all; Manager: department; Employee: own). |
| `GET` | `/api/leaves/{id}` | Authenticated | Retrieves leave by ID. |
| `GET` | `/api/leaves/{id}/conflicts` | Authenticated | Checks conflicts for an existing leave request. |
| `PUT` | `/api/leaves/{id}/approve` | Manager / HR | Approves leave and deducts balance. |
| `PUT` | `/api/leaves/{id}/reject` | Manager / HR | Rejects leave request. |
| `PUT` | `/api/leaves/{id}/cancel` | Authenticated | Cancels pending leave request. |

### Balances & Adjustments Endpoints
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leave-balances` | Authenticated | Lists leave balances (filtered by role scope). |
| `GET` | `/api/leave-balances/{id}` | Authenticated | Retrieves leave balance by ID. |
| `GET` | `/api/leave-balances/employee/{id}` | Authenticated | Retrieves balances for a specific employee. |
| `POST` | `/api/leave-balances` | HR_ADMIN | Initializes or updates an employee leave balance. |
| `GET` | `/api/leave-adjustments` | Authenticated | Lists adjustments (filtered by role scope). |
| `GET` | `/api/leave-adjustments/{id}` | Authenticated | Retrieves adjustment by ID. |
| `POST` | `/api/leave-adjustments` | HR_ADMIN | Credits or debits an employee's leave balance. |

### Policies, Holidays & Availability Endpoints
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leave-types` | Authenticated | Lists all leave types. |
| `POST` | `/api/leave-types` | HR_ADMIN | Creates a leave type. |
| `GET` | `/api/leave-policies` | Authenticated | Lists all leave policies. |
| `POST` | `/api/leave-policies` | HR_ADMIN | Creates a leave policy. |
| `GET` | `/api/holidays` | Authenticated | Lists all scheduled public holidays. |
| `POST` | `/api/holidays` | HR_ADMIN | Adds a public holiday. |
| `GET` | `/api/availability` | Authenticated | Department workforce availability on a given date (requires `departmentId`). |
| `GET` | `/api/departments/{id}/availability` | Authenticated | Department-specific availability on a given date. |
| `GET` | `/api/dashboard/overview` | HR_ADMIN | Organization-wide KPI statistics. |
| `GET` | `/api/audit-history` | HR_ADMIN | Paginated and filtered system audit events. |

---

## 11. Configuration

The application uses standard property placeholders in `src/main/resources/application.properties`:

| Property | Environment Variable | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `spring.datasource.url` | `DB_URL` | `jdbc:mysql://localhost:3306/employee_leave_db` | MySQL JDBC URL |
| `spring.datasource.username` | `DB_USERNAME` | `root` | Database user |
| `spring.datasource.password` | `DB_PASSWORD` | *(empty string)* | Database password |
| `server.port` | `SERVER_PORT` | `8080` | Backend HTTP port |
| `jwt.secret` | `JWT_SECRET` | *(ephemeral 256-bit key)* | HS256 JWT HMAC key (auto-generated in-memory if unconfigured) |
| `jwt.expiration-ms` | `JWT_EXPIRATION_MS` | `86400000` | Token validity in milliseconds (24h) |

---

## 12. Local Setup Guide (Windows / PowerShell)

### Prerequisites
- **JDK 21** installed (`java -version`)
- **MySQL 8.0+** running on port 3306 (`net start MySQL80` or via Windows Services)
- **Node.js (v18+) & npm** (`node -v`, `npm -v`)
- **Git**

### Step 1 — Clone the Repository
```powershell
git clone https://github.com/abhishekn27077/Employee-Leave_Management.git
cd Employee-Leave_Management
```

### Step 2 — Configure Database Credentials (If MySQL has a password)
The default MySQL password is empty. If your local MySQL `root` user requires a password, choose either method:
- **Method A (Recommended — Permanent & Git-safe)**: Copy `application-example.properties` to `src/main/resources/application-local.properties` (already in `.gitignore`) and specify your password:
  ```properties
  spring.datasource.password=your_mysql_password
  ```
- **Method B (Environment Variable)**:
  ```powershell
  $env:DB_PASSWORD="your_mysql_password"
  ```

*(Note: The JDBC URL is pre-configured with `createDatabaseIfNotExist=true`. As long as MySQL is running, Spring Boot will automatically create `employee_leave_db` on first boot if it does not already exist!)*

### Step 3 — Run the Application

#### Option 1: Turnkey One-Command Launcher (Recommended)
Run the included development launcher from the project root:
```powershell
.\start-dev.ps1
```
*This checks prerequisites (Java, Node, MySQL port 3306), verifies configuration, and launches both backend (port 8080) and frontend (port 5173/5174) in separate console windows.*

#### Option 2: Manual Terminal Commands
- **Terminal 1 (Backend)**:
  ```powershell
  .\mvnw.cmd spring-boot:run
  ```
  *Listens on `http://localhost:8080`. Automatically applies JPA schema and seeds demo accounts.*

- **Terminal 2 (Frontend)**:
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```
  *Opens on `http://localhost:5173` (or `http://localhost:5174` if 5173 is occupied). Both origins are fully allowed by backend CORS.*

---

## 13. Demo Walkthrough Accounts

The system automatically initializes 3 demo user accounts:

| Role | Username | Password | Linked Employee | Department |
| :--- | :--- | :--- | :--- | :--- |
| **EMPLOYEE** | `employee` | `Employee@123` | Suresh Raina (EMP101) | IT |
| **MANAGER** | `manager` | `Manager@123` | Aarav Mehta (EMP102) | IT |
| **HR_ADMIN** | `admin` | `Admin@123` | Priya Nair (EMP301) | Human Resources |

### Demo Workflow Scenarios

1. **Employee Workflow**:
   - Log in as `employee` / `Employee@123`.
   - Open **Dashboard** &rarr; View leave balances.
   - Click **Apply Leave** &rarr; Select Casual Leave, pick dates, enter reason.
   - Observe real-time conflict checking results.
   - Click **Submit Leave Request** &rarr; View new `PENDING` request in **My Leaves**.
   - Log out.

2. **Manager Approval Workflow**:
   - Log in as `manager` / `Manager@123`.
   - Open **Dashboard** &rarr; View pending approvals badge.
   - Open **Leave Approvals** queue &rarr; Review employee leave details and conflicts.
   - Click **Approve** or **Reject** with remarks.
   - Verify leave status updates and audit record is generated.
   - Log out.

3. **HR Administration Workflow**:
   - Log in as `admin` / `Admin@123`.
   - Open **Workforce Dashboard** &rarr; Review organization-wide metrics.
   - Explore **Employees**, **Departments**, **Leave Policies**, and **Holidays**.
   - Perform a manual balance adjustment in **Leave Adjustments**.
   - Open **Audit History** &rarr; Inspect audit logs with timestamps and old/new values.
   - Log out.

---

## 14. Testing & Verification

### Run Backend Unit & Service Tests
Executes 147 automated tests verifying business services, security rules, and conflict detection:
```powershell
.\mvnw.cmd test
```

### Build Backend Package
```powershell
.\mvnw.cmd clean package
```

### Run Frontend Production Build
```powershell
cd frontend
npm run build
```

### Run Frontend Linter
```powershell
cd frontend
npm run lint
```

---

## 15. Security Practices

- **Password Encryption**: All passwords stored using BCrypt with salt.
- **Stateless Sessions**: JWT tokens validated on every request; no server-side HTTP session storage required.
- **Role Guards**: Backend endpoints enforce access via `SecurityService` and method security; frontend routes prevent unauthorized navigation.
- **SQL Injection Prevention**: Parameterized queries and Spring Data JPA criteria queries prevent SQL injection.
- **Audit Logging**: All state mutations (leaves, approvals, rejections, cancellations, adjustments) generate audit records attributing the authenticated user (or SYSTEM for automated tasks) as the actor.
- **Repository Hygiene**: Local secrets and build artifacts are strictly ignored via `.gitignore`.

---

## 16. Troubleshooting

- **MySQL Connection Refused**:
  - Verify MySQL service is running in Windows Services (`services.msc`) or run `net start MySQL80`.
- **Unknown database 'employee_leave_db'**:
  - Run `CREATE DATABASE IF NOT EXISTS employee_leave_db;` in MySQL.
- **Port 8080 already in use**:
  - Terminate the process using port 8080 or pass `$env:SERVER_PORT=8081`.
- **Port 5173 already in use**:
  - Vite will automatically prompt or select port 5174.
- **Frontend API Network Error**:
  - Ensure the Spring Boot backend is running and accessible on port 8080 before launching the frontend.

---

## 17. Important Commands Reference

```powershell
# Run backend
.\mvnw.cmd spring-boot:run

# Run backend test suite
.\mvnw.cmd test

# Build backend executable JAR
.\mvnw.cmd clean package

# Install frontend dependencies
cd frontend
npm install

# Run frontend development server
npm run dev

# Build frontend production bundle
npm run build
```
