package com.example.employeeleave.service;

import com.example.employeeleave.dto.AuthResponseDTO;
import com.example.employeeleave.dto.LoginRequestDTO;
import com.example.employeeleave.dto.UserSummaryDTO;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.exception.AccountDisabledException;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.UnauthorizedException;
import com.example.employeeleave.repository.UserAccountRepository;
import com.example.employeeleave.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserAccountRepository userAccountRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public AuthResponseDTO login(LoginRequestDTO request) {
        if (request == null || request.getUsernameOrEmail() == null || request.getPassword() == null) {
            throw new BadRequestException("Username/email and password must be provided");
        }

        String identifier = request.getUsernameOrEmail().trim();
        String rawPassword = request.getPassword();

        UserAccount user = userAccountRepository.findByUsernameOrEmail(identifier, identifier)
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid username or password");
        }

        if (!user.isActive()) {
            throw new AccountDisabledException("Account is disabled. Please contact your system administrator.");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userAccountRepository.save(user);

        String token = jwtTokenProvider.generateToken(user);
        UserSummaryDTO summary = convertToSummary(user);

        return new AuthResponseDTO(token, summary, "Login successful");
    }

    @Transactional(readOnly = true)
    public UserSummaryDTO getCurrentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing or malformed Authorization header. Expected Bearer token.");
        }

        String token = authHeader.substring(7).trim();
        if (!jwtTokenProvider.validateToken(token)) {
            throw new UnauthorizedException("Invalid or expired session token");
        }

        String username = jwtTokenProvider.getUsernameFromToken(token);
        if (username == null) {
            throw new UnauthorizedException("Token payload missing subject");
        }

        UserAccount user = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user account not found"));

        if (!user.isActive()) {
            throw new AccountDisabledException("Account is disabled. Please contact your system administrator.");
        }

        return convertToSummary(user);
    }

    @Transactional
    public UserAccount createAccount(String username, String email, String rawPassword, UserRole role, boolean active, Employee employee) {
        if (username == null || username.trim().isEmpty()) {
            throw new BadRequestException("Username cannot be blank");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new BadRequestException("Email cannot be blank");
        }
        if (rawPassword == null || rawPassword.trim().isEmpty()) {
            throw new BadRequestException("Password cannot be blank");
        }
        if (role == null) {
            throw new BadRequestException("Role cannot be null");
        }

        String cleanUsername = username.trim().toLowerCase();
        String cleanEmail = email.trim().toLowerCase();

        if (userAccountRepository.existsByUsername(cleanUsername)) {
            throw new BadRequestException("Username already exists: " + cleanUsername);
        }
        if (userAccountRepository.existsByEmail(cleanEmail)) {
            throw new BadRequestException("Email already exists: " + cleanEmail);
        }

        String passwordHash = passwordEncoder.encode(rawPassword);
        UserAccount account = new UserAccount(cleanUsername, cleanEmail, passwordHash, role, active, employee);
        return userAccountRepository.save(account);
    }

    public UserSummaryDTO convertToSummary(UserAccount user) {
        if (user == null) return null;

        Long empId = null;
        String empCode = null;
        String empName = null;
        String designation = null;
        Long deptId = null;
        String deptName = null;

        Employee employee = user.getEmployee();
        if (employee != null) {
            empId = employee.getId();
            empCode = employee.getEmployeeId();
            empName = employee.getName();
            designation = employee.getDesignation();

            if (employee.getDepartment() != null) {
                deptId = employee.getDepartment().getId();
                deptName = employee.getDepartment().getName();
            }
        }

        return new UserSummaryDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isActive(),
                empId,
                empCode,
                empName,
                designation,
                deptId,
                deptName,
                user.getLastLoginAt()
        );
    }
}
