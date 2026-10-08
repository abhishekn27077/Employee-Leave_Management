package com.example.employeeleave.config;

import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.UserAccountRepository;
import com.example.employeeleave.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class AuthDataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AuthDataInitializer.class);

    private final UserAccountRepository userAccountRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthService authService;

    public AuthDataInitializer(UserAccountRepository userAccountRepository,
                               EmployeeRepository employeeRepository,
                               AuthService authService) {
        this.userAccountRepository = userAccountRepository;
        this.employeeRepository = employeeRepository;
        this.authService = authService;
    }

    @Override
    public void run(String... args) {
        logger.info("Verifying baseline and demo user accounts for seeded workforce...");
        List<Employee> employees = employeeRepository.findAll();
        if (employees.isEmpty()) {
            logger.info("No employee records found. Skipping auth initialization.");
            return;
        }

        Employee emp1 = employeeRepository.findByEmployeeId("EMP101")
                .orElse(employees.size() > 0 ? employees.get(0) : null);
        Employee emp2 = employeeRepository.findByEmployeeId("EMP102")
                .orElse(employees.size() > 1 ? employees.get(1) : emp1);
        Employee emp3 = employeeRepository.findByEmployeeId("EMP301")
                .orElse(employees.size() > 2 ? employees.get(2) : emp2);

        // 1. Baseline Employee Account (username: "employee", password: "Employee@123")
        if (!userAccountRepository.existsByUsername("employee") && emp1 != null && !userAccountRepository.findByEmployeeId(emp1.getId()).isPresent()) {
            try {
                authService.createAccount(
                        "employee",
                        emp1.getEmail() != null ? emp1.getEmail() : "employee@company.com",
                        "Employee@123",
                        UserRole.EMPLOYEE,
                        true,
                        emp1
                );
                logger.info("Created baseline 'employee' account for {}", emp1.getName());
            } catch (Exception e) {
                logger.warn("Auth initialization notice (employee): {}", e.getMessage());
            }
        }

        // 2. Baseline Manager Account (username: "manager", password: "Manager@123")
        if (!userAccountRepository.existsByUsername("manager") && emp2 != null && !userAccountRepository.findByEmployeeId(emp2.getId()).isPresent()) {
            try {
                authService.createAccount(
                        "manager",
                        emp2.getEmail() != null ? emp2.getEmail() : "manager@company.com",
                        "Manager@123",
                        UserRole.MANAGER,
                        true,
                        emp2
                );
                logger.info("Created baseline 'manager' account for {}", emp2.getName());
            } catch (Exception e) {
                logger.warn("Auth initialization notice (manager): {}", e.getMessage());
            }
        }

        // 3. Baseline HR Admin Account (username: "admin", password: "Admin@123")
        if (!userAccountRepository.existsByUsername("admin") && emp3 != null && !userAccountRepository.findByEmployeeId(emp3.getId()).isPresent()) {
            try {
                authService.createAccount(
                        "admin",
                        emp3.getEmail() != null ? emp3.getEmail() : "admin@company.com",
                        "Admin@123",
                        UserRole.HR_ADMIN,
                        true,
                        emp3
                );
                logger.info("Created baseline 'admin' account for {}", emp3.getName());
            } catch (Exception e) {
                logger.warn("Auth initialization notice (admin): {}", e.getMessage());
            }
        }

        // 4. Provision demo accounts for all seeded employees without an account
        int createdCount = 0;
        for (Employee emp : employees) {
            Optional<UserAccount> existingAccount = userAccountRepository.findByEmployeeId(emp.getId());
            if (existingAccount.isPresent()) {
                continue; // Employee already has a linked UserAccount - leave intact
            }

            String email = emp.getEmail() != null ? emp.getEmail().trim().toLowerCase() : "";
            if (email.isEmpty()) {
                logger.warn("Employee ID {} has no email. Skipping demo account creation.", emp.getId());
                continue;
            }

            if (userAccountRepository.existsByEmail(email)) {
                logger.warn("UserAccount with email '{}' already exists. Skipping duplicate account creation for {}.", email, emp.getName());
                continue;
            }

            // Derive username: use email prefix if available and unique, otherwise fallback to email or employee code
            String candidateUsername = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
            if (userAccountRepository.existsByUsername(candidateUsername)) {
                candidateUsername = email;
            }
            if (userAccountRepository.existsByUsername(candidateUsername)) {
                candidateUsername = emp.getEmployeeId() != null ? emp.getEmployeeId().toLowerCase() : ("emp" + emp.getId());
            }
            if (userAccountRepository.existsByUsername(candidateUsername)) {
                continue;
            }

            // Determine role based on existing business configuration
            UserRole role = UserRole.EMPLOYEE;
            if ("EMP102".equalsIgnoreCase(emp.getEmployeeId())) {
                role = UserRole.MANAGER;
            } else if ("EMP301".equalsIgnoreCase(emp.getEmployeeId())) {
                role = UserRole.HR_ADMIN;
            }

            try {
                authService.createAccount(
                        candidateUsername,
                        email,
                        "Demo@123",
                        role,
                        true,
                        emp
                );
                createdCount++;
                logger.info("Provisioned demo login account: [Employee: '{}' ({}), Email: '{}', Username: '{}', Role: '{}']",
                        emp.getName(), emp.getEmployeeId(), email, candidateUsername, role);
            } catch (Exception e) {
                logger.warn("Error creating demo account for employee {}: {}", emp.getName(), e.getMessage());
            }
        }

        logger.info("Demo user account verification complete. Newly provisioned: {}, Total accounts: {}",
                createdCount, userAccountRepository.count());
    }
}
