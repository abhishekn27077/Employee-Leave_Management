# LOCAL / COLLEGE DEMO CREDENTIALS
> **NOT FOR PRODUCTION USE**
> 
> This document lists the local demonstration accounts configured for academic and presentation evaluation of the Employee Leave Management System.
> 
> All passwords are stored in the database as salted BCrypt password hashes. Plaintext passwords are NEVER stored in the database.

---

## Seeded Employee Login Accounts

You can log into the application using the **Login Email** and the corresponding **Demo Password** indicated in the table below:

| Employee | Employee ID | Role | Login Email | Demo Password | Department | Designation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Aarav Mehta** | `EMP102` | `MANAGER` | `aarav.mehta@example.com` | `Manager@123` | IT | Senior Systems Engineer (Manager) |
| **Priya Nair** | `EMP301` | `HR_ADMIN` | `priya.nair@example.com` | `Admin@123` | Human Resources | HR Business Partner (Admin) |
| **Suresh Raina** | `EMP101` | `EMPLOYEE` | `suresh.raina@example.com` | `Employee@123` | IT | Lead Analyst |
| **Pooja Sharma** | `EMP103` | `EMPLOYEE` | `pooja.sharma@example.com` | `Demo@123` | IT | Cloud Infrastructure Specialist |
| **Rohan Verma** | `EMP201` | `EMPLOYEE` | `rohan.verma@example.com` | `Demo@123` | Engineering | Principal Software Engineer |
| **Ananya Iyer** | `EMP202` | `EMPLOYEE` | `ananya.iyer@example.com` | `Demo@123` | Engineering | Frontend Tech Lead |
| **Vikram Malhotra** | `EMP203` | `EMPLOYEE` | `vikram.malhotra@example.com` | `Demo@123` | Engineering | Backend Engineer |
| **Karan Kapoor** | `EMP302` | `EMPLOYEE` | `karan.kapoor@example.com` | `Demo@123` | Human Resources | Talent Acquisition Lead |
| **Neha Gupta** | `EMP401` | `EMPLOYEE` | `neha.gupta@example.com` | `Demo@123` | Finance | Senior Financial Analyst |
| **Rajesh Kothari** | `EMP402` | `EMPLOYEE` | `rajesh.kothari@example.com` | `Demo@123` | Finance | Accounts & Payroll Manager |
| **Sunita Reddy** | `EMP501` | `EMPLOYEE` | `sunita.reddy@example.com` | `Demo@123` | Operations | Operations Director |
| **Amit Patel** | `EMP502` | `EMPLOYEE` | `amit.patel@example.com` | `Demo@123` | Operations | Logistics & Facility Lead |

---

## Baseline Shortcut Accounts

The original convenience demo shortcuts continue to function alongside the email logins:

| Profile | Username | Password | Linked Employee | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Employee** | `employee` | `Employee@123` | Suresh Raina (`EMP101`) | `EMPLOYEE` |
| **Manager** | `manager` | `Manager@123` | Aarav Mehta (`EMP102`) | `MANAGER` |
| **HR Admin** | `admin` | `Admin@123` | Priya Nair (`EMP301`) | `HR_ADMIN` |

---

## Demonstration Instructions for Evaluators / Teachers

1. **Accessing the Portal:**
   - Frontend Web App: `http://localhost:5173/login`
   - Backend API: `http://localhost:8080/api`

2. **Quick Demo Profiles:**
   - On the login screen, clicking any of the **Quick Demo Profiles** (Employee, Manager, HR Admin) automatically pre-fills the login form.

3. **Demonstrating Any Specific Seeded Employee:**
   - Choose any employee from the table above.
   - Enter their **Login Email** in the username/email input.
   - Enter `Demo@123` in the password input.
   - Click **Sign In** to view their customized dashboard, leave balances, leave history, and department context.

4. **Role Permissions & Security:**
   - **`EMPLOYEE`**: Can view personal dashboard, apply for leaves, check leave balances, view company holidays, and view departmental availability. Cannot approve leaves or access admin controls.
   - **`MANAGER`**: Can view departmental overview, review and approve/reject department members' leave requests, and track team availability. Cannot alter system configurations or access global audit logs.
   - **`HR_ADMIN`**: Full administrative authority over employees, departments, leave types, leave policies, balance adjustments, company holidays, and security audit logs.
