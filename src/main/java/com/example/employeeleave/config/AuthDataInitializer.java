package com.example.employeeleave.config;

import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.UserAccountRepository;
import com.example.employeeleave.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

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
        if (userAccountRepository.count() > 0) {
            return;
        }

        logger.info("Initializing baseline role-based authentication accounts...");
        List<Employee> employees = employeeRepository.findAll();

        Employee emp1 = employeeRepository.findByEmployeeId("EMP101")
                .orElse(employees.size() > 0 ? employees.get(0) : null);
        Employee emp2 = employeeRepository.findByEmployeeId("EMP102")
                .orElse(employees.size() > 1 ? employees.get(1) : emp1);
        Employee emp3 = employeeRepository.findByEmployeeId("EMP301")
                .orElse(employees.size() > 2 ? employees.get(2) : emp2);

        try {
            // 1. Employee Account
            authService.createAccount(
                    "employee",
                    emp1 != null ? emp1.getEmail() : "employee@company.com",
                    "Employee@123",
                    UserRole.EMPLOYEE,
                    true,
                    emp1
            );

            // 2. Manager Account
            authService.createAccount(
                    "manager",
                    emp2 != null && !emp2.getEmail().equalsIgnoreCase(emp1 != null ? emp1.getEmail() : "")
                            ? emp2.getEmail()
                            : "manager@company.com",
                    "Manager@123",
                    UserRole.MANAGER,
                    true,
                    emp2
            );

            // 3. HR Admin Account
            authService.createAccount(
                    "admin",
                    emp3 != null && !emp3.getEmail().equalsIgnoreCase(emp1 != null ? emp1.getEmail() : "")
                            && !emp3.getEmail().equalsIgnoreCase(emp2 != null ? emp2.getEmail() : "")
                            ? emp3.getEmail()
                            : "admin@company.com",
                    "Admin@123",
                    UserRole.HR_ADMIN,
                    true,
                    emp3
            );

            logger.info("Successfully provisioned baseline accounts for EMPLOYEE, MANAGER, and HR_ADMIN.");
        } catch (Exception e) {
            logger.warn("Auth initialization notice: {}", e.getMessage());
        }
    }
}
