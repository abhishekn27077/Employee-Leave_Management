package com.example.employeeleave.controller;

import com.example.employeeleave.dto.EmployeeRequestDTO;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.security.SecurityService;
import com.example.employeeleave.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final SecurityService securityService;

    public EmployeeController(EmployeeService employeeService, SecurityService securityService) {
        this.employeeService = employeeService;
        this.securityService = securityService;
    }

    @PostMapping
    public ResponseEntity<Employee> createEmployee(@Valid @RequestBody EmployeeRequestDTO request) {
        securityService.requireRole(UserRole.HR_ADMIN);
        Employee createdEmployee = employeeService.createEmployee(request);
        return new ResponseEntity<>(createdEmployee, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        if (securityService.isHrAdmin()) {
            return ResponseEntity.ok(employeeService.getAllEmployees());
        }

        if (securityService.isManager()) {
            Long deptId = securityService.getCurrentUser().getEmployee() != null &&
                    securityService.getCurrentUser().getEmployee().getDepartment() != null
                    ? securityService.getCurrentUser().getEmployee().getDepartment().getId()
                    : null;
            if (deptId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(employeeService.getEmployeesByDepartment(deptId));
        }

        // EMPLOYEE: can only view own employee record
        Employee ownEmployee = securityService.getCurrentUser().getEmployee();
        if (ownEmployee == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(Collections.singletonList(ownEmployee));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        securityService.validateEmployeeAccess(id);
        Employee employee = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(employee);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(@PathVariable Long id, @Valid @RequestBody EmployeeRequestDTO request) {
        securityService.requireRole(UserRole.HR_ADMIN);
        Employee updatedEmployee = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(updatedEmployee);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        securityService.requireRole(UserRole.HR_ADMIN);
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }
}
