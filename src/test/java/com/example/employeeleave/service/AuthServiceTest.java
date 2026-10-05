package com.example.employeeleave.service;

import com.example.employeeleave.dto.AuthResponseDTO;
import com.example.employeeleave.dto.LoginRequestDTO;
import com.example.employeeleave.dto.UserSummaryDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.exception.AccountDisabledException;
import com.example.employeeleave.exception.UnauthorizedException;
import com.example.employeeleave.repository.UserAccountRepository;
import com.example.employeeleave.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private Department department;
    private Employee employee;
    private UserAccount activeEmployeeAccount;
    private UserAccount disabledManagerAccount;
    private UserAccount adminAccount;

    private final String RAW_PASSWORD = "SecretPassword@123";
    private final String ENCODED_HASH = "$2a$12$e8rF87x3k987sampleHashedBcryptPassword";

    @BeforeEach
    void setUp() {
        department = new Department("Engineering");
        department.setId(10L);

        employee = new Employee(
                "EMP100",
                "Jane Doe",
                "jane.doe@company.com",
                "9876543210",
                "Senior Engineer",
                LocalDate.of(2025, 1, 15),
                department
        );
        employee.setId(100L);

        activeEmployeeAccount = new UserAccount(
                "janedoe",
                "jane.doe@company.com",
                ENCODED_HASH,
                UserRole.EMPLOYEE,
                true,
                employee
        );
        activeEmployeeAccount.setId(1L);

        disabledManagerAccount = new UserAccount(
                "manager_mark",
                "mark@company.com",
                ENCODED_HASH,
                UserRole.MANAGER,
                false,
                employee
        );
        disabledManagerAccount.setId(2L);

        adminAccount = new UserAccount(
                "admin",
                "admin@company.com",
                ENCODED_HASH,
                UserRole.HR_ADMIN,
                true,
                null
        );
        adminAccount.setId(3L);
    }

    @Test
    @DisplayName("1. Valid Login: Returns JWT Bearer token and full user summary")
    void testValidLogin_Success() {
        LoginRequestDTO request = new LoginRequestDTO("janedoe", RAW_PASSWORD);

        when(userAccountRepository.findByUsernameOrEmail("janedoe", "janedoe"))
                .thenReturn(Optional.of(activeEmployeeAccount));
        when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_HASH)).thenReturn(true);
        when(jwtTokenProvider.generateToken(activeEmployeeAccount)).thenReturn("jwt.token.value");
        when(userAccountRepository.save(any(UserAccount.class))).thenReturn(activeEmployeeAccount);

        AuthResponseDTO response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt.token.value", response.getToken());
        assertEquals("Bearer", response.getTokenType());
        assertTrue(response.isAuthenticated());

        UserSummaryDTO user = response.getUser();
        assertNotNull(user);
        assertEquals("janedoe", user.getUsername());
        assertEquals(UserRole.EMPLOYEE, user.getRole());
        assertEquals(100L, user.getEmployeeId());
        assertEquals("EMP100", user.getEmployeeCode());
        assertEquals("Jane Doe", user.getEmployeeName());
        assertEquals("Engineering", user.getDepartmentName());
        assertTrue(user.isActive());
    }

    @Test
    @DisplayName("2. Invalid Credentials: Password mismatch throws UnauthorizedException")
    void testInvalidCredentials_WrongPassword() {
        LoginRequestDTO request = new LoginRequestDTO("janedoe", "WrongPassword");

        when(userAccountRepository.findByUsernameOrEmail("janedoe", "janedoe"))
                .thenReturn(Optional.of(activeEmployeeAccount));
        when(passwordEncoder.matches("WrongPassword", ENCODED_HASH)).thenReturn(false);

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> authService.login(request));
        assertTrue(exception.getMessage().contains("Invalid username or password"));
        verify(jwtTokenProvider, never()).generateToken(any());
    }

    @Test
    @DisplayName("2b. Invalid Credentials: Non-existent user throws UnauthorizedException")
    void testInvalidCredentials_UserNotFound() {
        LoginRequestDTO request = new LoginRequestDTO("nonexistent", RAW_PASSWORD);

        when(userAccountRepository.findByUsernameOrEmail("nonexistent", "nonexistent"))
                .thenReturn(Optional.empty());

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> authService.login(request));
        assertTrue(exception.getMessage().contains("Invalid username or password"));
    }

    @Test
    @DisplayName("3. Disabled Account: Throws AccountDisabledException even if password matches")
    void testDisabledAccount_ThrowsAccountDisabledException() {
        LoginRequestDTO request = new LoginRequestDTO("manager_mark", RAW_PASSWORD);

        when(userAccountRepository.findByUsernameOrEmail("manager_mark", "manager_mark"))
                .thenReturn(Optional.of(disabledManagerAccount));
        when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_HASH)).thenReturn(true);

        AccountDisabledException exception = assertThrows(AccountDisabledException.class, () -> authService.login(request));
        assertTrue(exception.getMessage().contains("Account is disabled"));
        verify(jwtTokenProvider, never()).generateToken(any());
    }

    @Test
    @DisplayName("4. Password Hashing: Account creation securely hashes password")
    void testPasswordHashing_AccountCreation() {
        when(userAccountRepository.existsByUsername("newuser")).thenReturn(false);
        when(userAccountRepository.existsByEmail("newuser@company.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_HASH);
        when(userAccountRepository.save(any(UserAccount.class))).thenAnswer(i -> i.getArgument(0));

        UserAccount created = authService.createAccount(
                "newuser",
                "newuser@company.com",
                RAW_PASSWORD,
                UserRole.EMPLOYEE,
                true,
                employee
        );

        assertNotNull(created);
        assertNotEquals(RAW_PASSWORD, created.getPasswordHash());
        assertEquals(ENCODED_HASH, created.getPasswordHash());
        verify(passwordEncoder).encode(RAW_PASSWORD);
    }

    @Test
    @DisplayName("5. Current Authenticated User: Returns profile for valid Bearer token")
    void testGetCurrentUser_ValidToken() {
        String token = "valid.jwt.token";
        String authHeader = "Bearer " + token;

        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUsernameFromToken(token)).thenReturn("janedoe");
        when(userAccountRepository.findByUsername("janedoe")).thenReturn(Optional.of(activeEmployeeAccount));

        UserSummaryDTO user = authService.getCurrentUser(authHeader);

        assertNotNull(user);
        assertEquals("janedoe", user.getUsername());
        assertEquals(UserRole.EMPLOYEE, user.getRole());
        assertEquals("Jane Doe", user.getEmployeeName());
        assertEquals("Engineering", user.getDepartmentName());
    }

    @Test
    @DisplayName("5b. Current Authenticated User: Missing or malformed Bearer header throws UnauthorizedException")
    void testGetCurrentUser_MissingOrInvalidHeader() {
        assertThrows(UnauthorizedException.class, () -> authService.getCurrentUser(null));
        assertThrows(UnauthorizedException.class, () -> authService.getCurrentUser("InvalidHeader"));

        when(jwtTokenProvider.validateToken("bad.token")).thenReturn(false);
        assertThrows(UnauthorizedException.class, () -> authService.getCurrentUser("Bearer bad.token"));
    }

    @Test
    @DisplayName("6. Role Recognition: Supports all approved roles (EMPLOYEE, MANAGER, HR_ADMIN)")
    void testRoleRecognition_AllRoles() {
        UserSummaryDTO empSummary = authService.convertToSummary(activeEmployeeAccount);
        assertEquals(UserRole.EMPLOYEE, empSummary.getRole());

        UserSummaryDTO mgrSummary = authService.convertToSummary(disabledManagerAccount);
        assertEquals(UserRole.MANAGER, mgrSummary.getRole());

        UserSummaryDTO adminSummary = authService.convertToSummary(adminAccount);
        assertEquals(UserRole.HR_ADMIN, adminSummary.getRole());
    }

    @Test
    @DisplayName("7. Employee-Account Relationship: Correctly connects employee & department without exposing password hash")
    void testEmployeeAccountRelationship_SafeAttributes() {
        UserSummaryDTO summary = authService.convertToSummary(activeEmployeeAccount);

        assertNotNull(summary);
        assertEquals(1L, summary.getId());
        assertEquals("janedoe", summary.getUsername());
        assertEquals("jane.doe@company.com", summary.getEmail());
        assertEquals(UserRole.EMPLOYEE, summary.getRole());
        assertEquals(100L, summary.getEmployeeId());
        assertEquals("EMP100", summary.getEmployeeCode());
        assertEquals("Jane Doe", summary.getEmployeeName());
        assertEquals("Senior Engineer", summary.getDesignation());
        assertEquals(10L, summary.getDepartmentId());
        assertEquals("Engineering", summary.getDepartmentName());
        assertTrue(summary.isActive());
    }

    @Test
    @DisplayName("7b. Employee-Account Relationship: Gracefully handles standalone admin with null employee")
    void testEmployeeAccountRelationship_StandaloneAdmin() {
        UserSummaryDTO summary = authService.convertToSummary(adminAccount);

        assertNotNull(summary);
        assertEquals(3L, summary.getId());
        assertEquals("admin", summary.getUsername());
        assertEquals(UserRole.HR_ADMIN, summary.getRole());
        assertNull(summary.getEmployeeId());
        assertNull(summary.getEmployeeName());
        assertNull(summary.getDepartmentName());
    }
}
