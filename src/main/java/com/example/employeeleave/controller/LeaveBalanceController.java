package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeaveBalanceRequestDTO;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.security.SecurityService;
import com.example.employeeleave.service.LeaveBalanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/leave-balances")
public class LeaveBalanceController {

    private final LeaveBalanceService leaveBalanceService;
    private final SecurityService securityService;

    public LeaveBalanceController(LeaveBalanceService leaveBalanceService, SecurityService securityService) {
        this.leaveBalanceService = leaveBalanceService;
        this.securityService = securityService;
    }

    @PostMapping
    public ResponseEntity<LeaveBalance> createOrInitBalance(@Valid @RequestBody LeaveBalanceRequestDTO request) {
        securityService.requireRole(UserRole.HR_ADMIN);
        LeaveBalance created = leaveBalanceService.createOrInitBalance(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LeaveBalance>> getAllBalances(@RequestParam(required = false) Long employeeId) {
        if (employeeId != null) {
            securityService.validateEmployeeAccess(employeeId);
            return ResponseEntity.ok(leaveBalanceService.getBalancesByEmployee(employeeId));
        }

        if (securityService.isHrAdmin()) {
            return ResponseEntity.ok(leaveBalanceService.getAllBalances());
        }

        if (securityService.isManager()) {
            Long deptId = securityService.getCurrentUser().getEmployee() != null &&
                    securityService.getCurrentUser().getEmployee().getDepartment() != null
                    ? securityService.getCurrentUser().getEmployee().getDepartment().getId()
                    : null;
            if (deptId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(leaveBalanceService.getBalancesByDepartment(deptId));
        }

        // EMPLOYEE: returns only own balances
        Long ownEmployeeId = securityService.getCurrentUser().getEmployee() != null
                ? securityService.getCurrentUser().getEmployee().getId()
                : null;
        if (ownEmployeeId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(leaveBalanceService.getBalancesByEmployee(ownEmployeeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveBalance> getBalanceById(@PathVariable Long id) {
        LeaveBalance balance = leaveBalanceService.getBalanceById(id);
        securityService.validateEmployeeAccess(balance.getEmployee().getId());
        return ResponseEntity.ok(balance);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveBalance>> getBalancesByEmployeeId(@PathVariable Long employeeId) {
        securityService.validateEmployeeAccess(employeeId);
        List<LeaveBalance> balances = leaveBalanceService.getBalancesByEmployee(employeeId);
        return ResponseEntity.ok(balances);
    }
}
