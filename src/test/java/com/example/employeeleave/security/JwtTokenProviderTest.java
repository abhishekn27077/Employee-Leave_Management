package com.example.employeeleave.security;

import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(
                "TestSecretKeyWithAtLeast256BitsOfEntropyRequiredForHMACSHA256KeySpecification!",
                3600000L, // 1 hour
                new ObjectMapper()
        );

        Department dept = new Department("Finance");
        dept.setId(5L);

        Employee emp = new Employee("EMP55", "Alice Smith", "alice@company.com", "1234567890", "Accountant", LocalDate.now(), dept);
        emp.setId(55L);

        testUser = new UserAccount("alice", "alice@company.com", "hash", UserRole.EMPLOYEE, true, emp);
        testUser.setId(99L);
    }

    @Test
    @DisplayName("Generate and validate valid JWT token")
    void testGenerateAndValidateToken() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertNotNull(token);

        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("alice", jwtTokenProvider.getUsernameFromToken(token));
        assertEquals("EMPLOYEE", jwtTokenProvider.getRoleFromToken(token));
        assertEquals(55L, jwtTokenProvider.getEmployeeIdFromToken(token));
    }

    @Test
    @DisplayName("Reject tampered JWT token")
    void testTamperedToken_Rejected() {
        String token = jwtTokenProvider.generateToken(testUser);
        String[] parts = token.split("\\.");
        // Modify payload
        String tamperedToken = parts[0] + ".eyJzdWIiOiJoYWNrZXIifQ." + parts[2];

        assertFalse(jwtTokenProvider.validateToken(tamperedToken));
    }

    @Test
    @DisplayName("Reject expired JWT token")
    void testExpiredToken_Rejected() {
        // Provider with negative expiration
        JwtTokenProvider expiredProvider = new JwtTokenProvider(
                "TestSecretKeyWithAtLeast256BitsOfEntropyRequiredForHMACSHA256KeySpecification!",
                -1000L,
                new ObjectMapper()
        );

        String expiredToken = expiredProvider.generateToken(testUser);
        assertFalse(expiredProvider.validateToken(expiredToken));
    }

    @Test
    @DisplayName("Ephemeral key generated when secret is empty or null operates properly")
    void testEphemeralKeyGenerationWhenSecretEmpty() {
        JwtTokenProvider autoKeyProvider = new JwtTokenProvider(
                "",
                3600000L,
                new ObjectMapper()
        );

        String token = autoKeyProvider.generateToken(testUser);
        assertNotNull(token);
        assertTrue(autoKeyProvider.validateToken(token));
        assertEquals("alice", autoKeyProvider.getUsernameFromToken(token));

        // Token generated with one ephemeral key should be rejected by another provider with a different key
        assertFalse(jwtTokenProvider.validateToken(token));
    }
}
