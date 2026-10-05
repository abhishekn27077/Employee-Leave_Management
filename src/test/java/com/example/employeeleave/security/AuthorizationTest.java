package com.example.employeeleave.security;

import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.exception.AccountDisabledException;
import com.example.employeeleave.exception.ForbiddenException;
import com.example.employeeleave.exception.UnauthorizedException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorizationTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    private SecurityService securityService;
    private SecurityInterceptor securityInterceptor;

    private Department deptEngineering;
    private Department deptMarketing;

    private Employee empAlice;      // Engineering
    private Employee empBob;        // Engineering (colleague)
    private Employee empCharlie;    // Marketing (different dept)
    private Employee empManagerDave;// Manager in Engineering
    private Employee empAdminEve;   // HR Admin in Engineering

    private UserAccount userAliceEmployee;
    private UserAccount userDaveManager;
    private UserAccount userEveAdmin;
    private UserAccount userDisabled;

    @BeforeEach
    void setUp() {
        securityService = new SecurityService(employeeRepository);
        securityInterceptor = new SecurityInterceptor(jwtTokenProvider, userAccountRepository);

        deptEngineering = new Department("Engineering");
        deptEngineering.setId(1L);

        deptMarketing = new Department("Marketing");
        deptMarketing.setId(2L);

        empAlice = new Employee("EMP001", "Alice", "alice@example.com", "12345", "Engineer", LocalDate.now(), deptEngineering);
        empAlice.setId(10L);

        empBob = new Employee("EMP002", "Bob", "bob@example.com", "12346", "Senior Engineer", LocalDate.now(), deptEngineering);
        empBob.setId(20L);

        empCharlie = new Employee("EMP003", "Charlie", "charlie@example.com", "12347", "Marketer", LocalDate.now(), deptMarketing);
        empCharlie.setId(30L);

        empManagerDave = new Employee("MGR001", "Dave Manager", "dave@example.com", "12348", "Eng Manager", LocalDate.now(), deptEngineering);
        empManagerDave.setId(40L);

        empAdminEve = new Employee("ADM001", "Eve Admin", "eve@example.com", "12349", "HR Director", LocalDate.now(), deptEngineering);
        empAdminEve.setId(50L);

        userAliceEmployee = new UserAccount("alice", "alice@example.com", "hash", UserRole.EMPLOYEE, true, empAlice);
        userAliceEmployee.setId(1L);

        userDaveManager = new UserAccount("dave", "dave@example.com", "hash", UserRole.MANAGER, true, empManagerDave);
        userDaveManager.setId(2L);

        userEveAdmin = new UserAccount("eve", "eve@example.com", "hash", UserRole.HR_ADMIN, true, empAdminEve);
        userEveAdmin.setId(3L);

        userDisabled = new UserAccount("disabled_user", "disabled@example.com", "hash", UserRole.EMPLOYEE, false, empAlice);
        userDisabled.setId(4L);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Nested
    @DisplayName("1. Unauthenticated Request Handling (401)")
    class UnauthenticatedRequests {

        @Test
        @DisplayName("Missing Authorization header -> Rejected with 401")
        void testMissingTokenRejected() {
            when(request.getMethod()).thenReturn("GET");
            when(request.getRequestURI()).thenReturn("/api/leaves");
            when(request.getHeader("Authorization")).thenReturn(null);

            UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertEquals("Authentication token is required", ex.getMessage());
        }

        @Test
        @DisplayName("Invalid or expired Bearer token -> Rejected with 401")
        void testInvalidTokenRejected() {
            when(request.getMethod()).thenReturn("GET");
            when(request.getRequestURI()).thenReturn("/api/leaves");
            when(request.getHeader("Authorization")).thenReturn("Bearer invalid.token.payload");
            when(jwtTokenProvider.validateToken("invalid.token.payload")).thenReturn(false);

            UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertEquals("Invalid or expired session token", ex.getMessage());
        }

        @Test
        @DisplayName("Disabled account attempting request -> Rejected with 403")
        void testDisabledAccountRejected() {
            when(request.getMethod()).thenReturn("GET");
            when(request.getRequestURI()).thenReturn("/api/leaves");
            when(request.getHeader("Authorization")).thenReturn("Bearer valid.disabled.token");
            when(jwtTokenProvider.validateToken("valid.disabled.token")).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken("valid.disabled.token")).thenReturn("disabled_user");
            when(userAccountRepository.findByUsername("disabled_user")).thenReturn(Optional.of(userDisabled));

            AccountDisabledException ex = assertThrows(AccountDisabledException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertTrue(ex.getMessage().contains("Account is disabled"));
        }
    }

    @Nested
    @DisplayName("2 & 3. Employee Data Ownership Rules (200 vs 403)")
    class EmployeeOwnershipRules {

        @Test
        @DisplayName("Employee accessing own data -> Allowed")
        void testEmployeeAccessingOwnDataAllowed() {
            SecurityContext.setCurrentUser(userAliceEmployee);

            assertDoesNotThrow(() -> securityService.validateEmployeeAccess(10L));
        }

        @Test
        @DisplayName("Employee accessing another employee's private data -> Rejected with 403")
        void testEmployeeAccessingAnotherEmployeeDataRejected() {
            SecurityContext.setCurrentUser(userAliceEmployee);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateEmployeeAccess(20L)); // Bob's ID
            assertTrue(ex.getMessage().contains("You can only access your own"));
        }

        @Test
        @DisplayName("Employee applying leave for themselves -> Allowed")
        void testEmployeeApplyLeaveForSelfAllowed() {
            SecurityContext.setCurrentUser(userAliceEmployee);

            assertDoesNotThrow(() -> securityService.validateCanApplyLeave(10L));
        }

        @Test
        @DisplayName("Employee applying leave for another employee ID -> Rejected with 403")
        void testEmployeeApplyLeaveForOtherRejected() {
            SecurityContext.setCurrentUser(userAliceEmployee);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateCanApplyLeave(20L));
            assertTrue(ex.getMessage().contains("You can only apply for leave for yourself"));
        }
    }

    @Nested
    @DisplayName("4. Employee Attempting Admin Operations (403)")
    class EmployeeAdminOperations {

        @Test
        @DisplayName("Employee attempting to create department -> Rejected with 403")
        void testEmployeeCreatingDepartmentRejected() {
            when(request.getMethod()).thenReturn("POST");
            when(request.getRequestURI()).thenReturn("/api/departments");
            when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
            when(jwtTokenProvider.validateToken("valid.token")).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken("valid.token")).thenReturn("alice");
            when(userAccountRepository.findByUsername("alice")).thenReturn(Optional.of(userAliceEmployee));

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertTrue(ex.getMessage().contains("HR_ADMIN role required"));
        }

        @Test
        @DisplayName("Employee attempting to modify leave balances -> Rejected with 403")
        void testEmployeeModifyingBalancesRejected() {
            when(request.getMethod()).thenReturn("POST");
            when(request.getRequestURI()).thenReturn("/api/leave-balances");
            when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
            when(jwtTokenProvider.validateToken("valid.token")).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken("valid.token")).thenReturn("alice");
            when(userAccountRepository.findByUsername("alice")).thenReturn(Optional.of(userAliceEmployee));

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertTrue(ex.getMessage().contains("HR_ADMIN role required"));
        }

        @Test
        @DisplayName("Employee attempting to view audit history -> Rejected with 403")
        void testEmployeeViewingAuditHistoryRejected() {
            when(request.getMethod()).thenReturn("GET");
            when(request.getRequestURI()).thenReturn("/api/audit-history");
            when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
            when(jwtTokenProvider.validateToken("valid.token")).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken("valid.token")).thenReturn("alice");
            when(userAccountRepository.findByUsername("alice")).thenReturn(Optional.of(userAliceEmployee));

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertTrue(ex.getMessage().contains("HR_ADMIN role required"));
        }
    }

    @Nested
    @DisplayName("5. Employee Attempting Approval / Reject (403)")
    class EmployeeApprovalRestrictions {

        @Test
        @DisplayName("Employee attempting to approve any leave -> Rejected with 403")
        void testEmployeeApprovingLeaveRejected() {
            SecurityContext.setCurrentUser(userAliceEmployee);
            Leave leave = new Leave(empBob, null, LocalDate.now(), LocalDate.now().plusDays(1), "Vacation", LeaveStatus.PENDING);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateCanApproveOrReject(leave));
            assertTrue(ex.getMessage().contains("Employees are not authorized to approve or reject"));
        }

        @Test
        @DisplayName("Employee attempting to reject another employee leave -> Rejected with 403")
        void testEmployeeRejectingLeaveRejected() {
            SecurityContext.setCurrentUser(userAliceEmployee);
            Leave leave = new Leave(empBob, null, LocalDate.now(), LocalDate.now().plusDays(1), "Vacation", LeaveStatus.PENDING);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateCanApproveOrReject(leave));
            assertTrue(ex.getMessage().contains("Employees are not authorized to approve or reject"));
        }

        @Test
        @DisplayName("Employee attempting to cancel another employee's leave -> Rejected with 403")
        void testEmployeeCancellingOtherLeaveRejected() {
            SecurityContext.setCurrentUser(userAliceEmployee);
            Leave bobsLeave = new Leave(empBob, null, LocalDate.now(), LocalDate.now().plusDays(1), "Vacation", LeaveStatus.PENDING);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateCanCancelLeave(bobsLeave));
            assertTrue(ex.getMessage().contains("You can only cancel your own"));
        }

        @Test
        @DisplayName("Employee cancelling own leave -> Allowed")
        void testEmployeeCancellingOwnLeaveAllowed() {
            SecurityContext.setCurrentUser(userAliceEmployee);
            Leave alicesLeave = new Leave(empAlice, null, LocalDate.now(), LocalDate.now().plusDays(1), "Vacation", LeaveStatus.PENDING);

            assertDoesNotThrow(() -> securityService.validateCanCancelLeave(alicesLeave));
        }
    }

    @Nested
    @DisplayName("6 & 7. Manager Permissions & Administrative Boundaries")
    class ManagerAccessRules {

        @Test
        @DisplayName("Manager accessing permitted team data in their department -> Allowed")
        void testManagerAccessingTeamDataAllowed() {
            SecurityContext.setCurrentUser(userDaveManager);
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(empAlice)); // Alice is in Engineering

            assertDoesNotThrow(() -> securityService.validateEmployeeAccess(10L));
        }

        @Test
        @DisplayName("Manager accessing employee in a different department -> Rejected with 403")
        void testManagerAccessingOtherDepartmentRejected() {
            SecurityContext.setCurrentUser(userDaveManager);
            when(employeeRepository.findById(30L)).thenReturn(Optional.of(empCharlie)); // Charlie is in Marketing

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateEmployeeAccess(30L));
            assertTrue(ex.getMessage().contains("You can only view records for employees in your department team"));
        }

        @Test
        @DisplayName("Manager attempting unauthorized administrative operation -> Rejected with 403")
        void testManagerAdminOperationRejected() {
            when(request.getMethod()).thenReturn("POST");
            when(request.getRequestURI()).thenReturn("/api/departments");
            when(request.getHeader("Authorization")).thenReturn("Bearer manager.token");
            when(jwtTokenProvider.validateToken("manager.token")).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken("manager.token")).thenReturn("dave");
            when(userAccountRepository.findByUsername("dave")).thenReturn(Optional.of(userDaveManager));

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityInterceptor.preHandle(request, response, new Object()));
            assertTrue(ex.getMessage().contains("HR_ADMIN role required"));
        }
    }

    @Nested
    @DisplayName("8. Manager Approval Security Rules")
    class ManagerApprovalRules {

        @Test
        @DisplayName("Manager approving eligible request of department team member -> Allowed")
        void testManagerApprovingTeamMemberAllowed() {
            SecurityContext.setCurrentUser(userDaveManager);
            Leave teamLeave = new Leave(empAlice, null, LocalDate.now(), LocalDate.now().plusDays(2), "Flu", LeaveStatus.PENDING);

            assertDoesNotThrow(() -> securityService.validateCanApproveOrReject(teamLeave));
        }

        @Test
        @DisplayName("Manager approving employee in another department -> Rejected with 403")
        void testManagerApprovingOtherDepartmentRejected() {
            SecurityContext.setCurrentUser(userDaveManager);
            Leave marketingLeave = new Leave(empCharlie, null, LocalDate.now(), LocalDate.now().plusDays(2), "Conference", LeaveStatus.PENDING);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateCanApproveOrReject(marketingLeave));
            assertTrue(ex.getMessage().contains("Managers can only approve or reject leave requests for their own department team"));
        }

        @Test
        @DisplayName("Manager approving their own leave request -> Rejected with 403")
        void testManagerApprovingOwnLeaveRejected() {
            SecurityContext.setCurrentUser(userDaveManager);
            Leave managerOwnLeave = new Leave(empManagerDave, null, LocalDate.now(), LocalDate.now().plusDays(3), "Trip", LeaveStatus.PENDING);

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateCanApproveOrReject(managerOwnLeave));
            assertTrue(ex.getMessage().contains("Managers cannot approve or reject their own leave requests"));
        }
    }

    @Nested
    @DisplayName("9. HR_ADMIN Oversight & Administrative Modules")
    class HrAdminAccessRules {

        @Test
        @DisplayName("HR_ADMIN accessing administrative write endpoints -> Allowed")
        void testHrAdminAdminEndpointsAllowed() {
            when(request.getMethod()).thenReturn("POST");
            when(request.getRequestURI()).thenReturn("/api/departments");
            when(request.getHeader("Authorization")).thenReturn("Bearer admin.token");
            when(jwtTokenProvider.validateToken("admin.token")).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken("admin.token")).thenReturn("eve");
            when(userAccountRepository.findByUsername("eve")).thenReturn(Optional.of(userEveAdmin));

            boolean allowed = securityInterceptor.preHandle(request, response, new Object());
            assertTrue(allowed);
        }

        @Test
        @DisplayName("HR_ADMIN approving any department's leave request -> Allowed")
        void testHrAdminApprovalOversightAllowed() {
            SecurityContext.setCurrentUser(userEveAdmin);
            Leave marketingLeave = new Leave(empCharlie, null, LocalDate.now(), LocalDate.now().plusDays(1), "Vacation", LeaveStatus.PENDING);

            assertDoesNotThrow(() -> securityService.validateCanApproveOrReject(marketingLeave));
        }

        @Test
        @DisplayName("HR_ADMIN accessing any employee's private records -> Allowed")
        void testHrAdminEmployeeAccessAllowed() {
            SecurityContext.setCurrentUser(userEveAdmin);

            assertDoesNotThrow(() -> securityService.validateEmployeeAccess(30L)); // Charlie in Marketing
        }

        @Test
        @DisplayName("HR_ADMIN viewing any department availability -> Allowed")
        void testHrAdminDepartmentAvailabilityAllowed() {
            SecurityContext.setCurrentUser(userEveAdmin);

            assertDoesNotThrow(() -> securityService.validateDepartmentAvailabilityAccess(2L)); // Marketing
        }
    }

    @Nested
    @DisplayName("10. Department Availability Scoping")
    class DepartmentAvailabilityRules {

        @Test
        @DisplayName("Employee viewing own department availability -> Allowed")
        void testEmployeeViewingOwnDepartmentAvailabilityAllowed() {
            SecurityContext.setCurrentUser(userAliceEmployee); // Engineering deptId = 1L

            assertDoesNotThrow(() -> securityService.validateDepartmentAvailabilityAccess(1L));
        }

        @Test
        @DisplayName("Employee viewing another department availability -> Rejected with 403")
        void testEmployeeViewingOtherDepartmentAvailabilityRejected() {
            SecurityContext.setCurrentUser(userAliceEmployee); // Engineering deptId = 1L

            ForbiddenException ex = assertThrows(ForbiddenException.class,
                    () -> securityService.validateDepartmentAvailabilityAccess(2L)); // Marketing deptId = 2L
            assertTrue(ex.getMessage().contains("You can only view team availability for your own department"));
        }
    }
}
