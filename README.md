# Employee Leave Management System

An enterprise-grade, full-stack Employee Leave Management and Workforce Availability platform built with **Spring Boot 4**, **Spring Data JPA / Hibernate**, **MySQL**, and **React 19 + Vite**.

---

## 1. Project Purpose

The Employee Leave Management System provides organizations with automated workforce scheduling, leave lifecycle management, conflict detection, and policy enforcement. It eliminates manual spreadsheet tracking by automating entitlement balances, holiday collisions, departmental staffing availability thresholds, and audit histories.

---

## 2. Main Features & Modules

1. **Department Management**: Complete organization structural hierarchy, staff counting, and referential integrity protection against orphan assignments.
2. **Employee Directory**: Full employee master data including corporate ID, department associations, designation, contact info, and joining date.
3. **Leave Types**: Configurable categories (Casual, Sick, Paid, Maternity, Sabbatical, etc.) with customizable default day allocations.
4. **Leave Policy Engine**: Department and company-wide rules defining entitlement caps, maximum consecutive days, advance notice requirements, and managerial approval necessity.
5. **Leave Balance Foundation**: Dynamic tracking where `remainingBalance = entitlement - approvedLeave + adjustments`. Automatically protects against negative balances.
6. **Holiday Calendar**: Centralized public holiday scheduler with duplicate date rejection and integrated collision detection.
7. **Leave Application & Workflow**: Standardized leave application flow starting strictly in `PENDING` status, with guarded state transitions (`PENDING -> APPROVED`, `PENDING -> REJECTED`, `PENDING -> CANCELLED`) and immutability once finalized.
8. **Workforce Availability Engine**: Real-time calculation of active staff versus employees on approved leave per department on any selected date, reporting staffing percentages and warnings.
9. **Conflict Detection Engine**: Multi-dimensional rule evaluator checking balance sufficiency, policy compliance, date validity, public holiday collisions, overlapping requests, and departmental staffing thresholds prior to approval.
10. **Leave Adjustments**: Authorized administrative balance corrections supporting positive credits and negative deductions with audit-logged reference numbers and justification reasons.
11. **Immutable Audit Trail**: Append-only event store capturing entity alterations, user actions, status changes, and balance modifications with timestamps.
12. **Executive Workforce Dashboard**: Real-time analytics aggregating workforce counts, pending requests, approval rates, utilization percentages, upcoming leaves, and detected conflicts with zero mock data.

---

## 3. Technology Stack

- **Backend Framework**: Spring Boot 4.1.1 (Java 21)
- **Data Persistence**: Spring Data JPA, Hibernate ORM
- **Database**: MySQL 8.x
- **Bean Validation**: Hibernate Validator (`jakarta.validation`)
- **Frontend Framework**: React 19, React Router v7
- **Bundler & Dev Server**: Vite 8
- **HTTP Client**: Axios
- **Build Tools**: Apache Maven 3.9+, Node.js (v18+) & npm

---

## 4. Architecture

The system follows a strict layered Spring Boot enterprise architecture:

```
[ React 19 Frontend UI (Vite) ]
               │
               ▼ (HTTP / REST APIs with JSON DTOs)
[ Spring Boot REST Controllers ]
               │
               ▼ (DTO Validation & HTTP Status mapping)
[ Service Layer (Business Logic & Transactions) ]
               │
               ▼ (Spring Data JPA Repositories)
[ Entity / Domain Model Layer (JPA / Hibernate) ]
               │
               ▼ (JDBC Connection Pooling via HikariCP)
[ MySQL Database (ACID Relational Storage) ]
```

- **Controller Layer**: Exclusively handles HTTP routing, request parsing, and response status mapping.
- **Service Layer**: Houses all transaction boundaries (`@Transactional`), business constraints, calculation logic, and conflict checks.
- **Repository Layer**: Pure Spring Data JPA interfaces with type-safe query methods and JPQL queries.
- **Exception Handling**: Centralized [`GlobalExceptionHandler`](file:///d:/projects/employee-leave-management/employee-leave-management/src/main/java/com/example/employeeleave/exception/GlobalExceptionHandler.java) mapping standard Spring and custom exceptions (`ResourceNotFoundException`, `BadRequestException`, `LeaveConflictException`) to structured JSON error objects.

---

## 5. Project Structure

```
employee-leave-management/
├── pom.xml                               # Maven project definition and dependencies
├── application-example.properties        # Example environment configuration template
├── src/
│   ├── main/
│   │   ├── java/com/example/employeeleave/
│   │   │   ├── EmployeeLeaveManagementApplication.java  # Application entry point
│   │   │   ├── config/                   # CORS and Web MVC configuration
│   │   │   ├── controller/               # REST Controllers (11 controllers)
│   │   │   ├── dto/                      # Data Transfer Objects & Enums
│   │   │   ├── entity/                   # JPA Entity models (9 entities)
│   │   │   ├── exception/                # Centralized exception handlers
│   │   │   ├── repository/               # Spring Data JPA repositories (9 repositories)
│   │   │   └── service/                  # Business logic services (11 services)
│   │   └── resources/
│   │       └── application.properties    # Primary runtime configuration
│   └── test/
│       └── java/com/example/employeeleave/service/  # Comprehensive unit & service tests
└── frontend/
    ├── package.json                      # Frontend dependencies and scripts
    ├── vite.config.js                    # Vite configuration
    ├── index.html                        # Single Page App root HTML
    └── src/
        ├── App.jsx                       # Application routing & layout
        ├── index.css                     # Design tokens & styling
        ├── components/                   # Reusable UI components (Sidebar, Header, Badges)
        ├── pages/                        # Feature pages (10 modules + Dashboard)
        └── services/api.js               # Axios API client & error interceptors
```

---

## 6. Database Overview & Relational Design

The MySQL schema is normalized and guarded by foreign key constraints:

- `departments` &rarr; Referenced by `employees.department_id` (`ON DELETE RESTRICT`)
- `employees` &rarr; Referenced by `leaves.employee_id`, `leave_balances.employee_id`, `leave_adjustments.employee_id`
- `leave_types` &rarr; Referenced by `leaves.leave_type_id`, `leave_balances.leave_type_id`, `leave_policies.leave_type_id`, `leave_adjustments.leave_type_id`
- `leaves` &rarr; Tracks start/end dates, effective days, status (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), and decision remarks
- `holidays` &rarr; Unique indexed holiday calendar dates
- `audit_history` &rarr; Immutable append-only log capturing actor, action, target entity, timestamp, and state diffs

---

## 7. Configuration & Environment Variables

Database credentials are parameterized using Spring environment variable substitution with safe defaults:

| Property | Environment Variable | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `spring.datasource.url` | `DB_URL` | `jdbc:mysql://localhost:3306/employee_leave_db` | MySQL JDBC connection URL |
| `spring.datasource.username` | `DB_USERNAME` | `root` | Database username |
| `spring.datasource.password` | `DB_PASSWORD` | *(empty)* | Database password |
| `server.port` | `SERVER_PORT` | `8080` | Backend listening port |

### Developer Local Configuration (Optional)
To override credentials locally without modifying version-controlled files, create `application-local.properties` in `src/main/resources/` (this file is excluded by `.gitignore`):

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/employee_leave_db
spring.datasource.username=root
spring.datasource.password=your_secure_password
```

---

## 8. Setup & Execution

### Prerequisites
- Java Development Kit (JDK 21 or higher)
- MySQL Server (v8.0+)
- Node.js (v18+) and npm
- Git

### Database Setup
Log into MySQL and initialize the database:
```sql
CREATE DATABASE IF NOT EXISTS employee_leave_db;
```

### Running Backend (Spring Boot)
From the project root directory:
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```
Backend API will start at: `http://localhost:8080/api`

### Running Frontend (React + Vite)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend application will be accessible at: `http://localhost:5173`

---

## 9. Key REST API Endpoints

### Departments
- `GET /api/departments` — List all departments
- `POST /api/departments` — Create department
- `GET /api/departments/{id}` — Get department by ID
- `PUT /api/departments/{id}` — Update department
- `DELETE /api/departments/{id}` — Delete department

### Employees
- `GET /api/employees` — List all employees
- `POST /api/employees` — Register new employee
- `GET /api/employees/{id}` — Get employee by ID
- `PUT /api/employees/{id}` — Update employee details
- `DELETE /api/employees/{id}` — Delete employee

### Leave Requests & Workflow
- `GET /api/leaves` — List all leave applications
- `POST /api/leaves` — Submit new leave application (initial status `PENDING`)
- `GET /api/leaves/{id}` — Get leave application details
- `PUT /api/leaves/{id}/approve` — Transition `PENDING` &rarr; `APPROVED` (deducts leave balance)
- `PUT /api/leaves/{id}/reject` — Transition `PENDING` &rarr; `REJECTED`
- `PUT /api/leaves/{id}/cancel` — Transition `PENDING` &rarr; `CANCELLED`

### Conflict Detection & Availability
- `POST /api/leaves/evaluate-conflicts` — Pre-evaluate candidate leave for rule, balance, holiday, and staffing conflicts without persisting
- `GET /api/leaves/{id}/conflicts` — Check conflicts for an existing pending leave request
- `GET /api/team-availability` — Query workforce availability by `departmentId` and `date`

### Leave Balances & Adjustments
- `GET /api/leave-balances/employee/{employeeId}` — Retrieve employee's leave balance breakdown
- `POST /api/leave-adjustments` — Record administrative balance adjustment (`+` credit or `-` deduction)
- `GET /api/leave-adjustments` — List adjustment transactions

### Holidays & Audit History
- `GET /api/holidays` — List official holidays
- `POST /api/holidays` — Add public holiday
- `GET /api/audit-history` — Retrieve immutable audit trail (DELETE is strictly blocked)

### Dashboard Overview
- `GET /api/dashboard/overview` — Executive summary of real workforce metrics, KPIs, recent leave activities, and upcoming approved leaves

---

## 10. Automated Testing

### Backend Unit & Service Tests
Run all 100+ automated JUnit / Mockito service tests:
```bash
.\mvnw.cmd test
```

### Full Production Build
```bash
# Package backend JAR
.\mvnw.cmd clean package -DskipTests=false

# Build frontend production bundle
cd frontend
npm run build
```

---

## 11. Important Business Workflows

### Standard Leave Application & Lifecycle
```
[ Employee submits leave request ]
               │
               ▼
[ Pre-Submission Conflict Engine Evaluation ]
├── 1. Leave Balance Check (Remaining >= Requested days)
├── 2. Policy Rule Check (Max consecutive days & notice)
├── 3. Public Holiday Overlap Check
├── 4. Existing Leave Collisions Check
└── 5. Department Minimum Availability Threshold Check
               │
        (Valid / Approved)
               ▼
[ Request stored in PENDING status ]
               │
     ┌─────────┴─────────┐
     ▼                   ▼
[ Manager Approves ]   [ Manager Rejects / Employee Cancels ]
     │                   │
     ▼                   ▼
Status -> APPROVED     Status -> REJECTED / CANCELLED
Balance deducted       Balance unchanged
Audit record logged    Audit record logged
```
