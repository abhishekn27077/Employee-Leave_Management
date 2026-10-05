package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeaveAdjustmentRequestDTO;
import com.example.employeeleave.entity.LeaveAdjustment;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.security.SecurityService;
import com.example.employeeleave.service.LeaveAdjustmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/leave-adjustments")
public class LeaveAdjustmentController {

    private final LeaveAdjustmentService adjustmentService;
    private final SecurityService securityService;

    public LeaveAdjustmentController(LeaveAdjustmentService adjustmentService, SecurityService securityService) {
        this.adjustmentService = adjustmentService;
        this.securityService = securityService;
    }

    @PostMapping
    public ResponseEntity<LeaveAdjustment> createAdjustment(@Valid @RequestBody LeaveAdjustmentRequestDTO dto) {
        securityService.requireRole(UserRole.HR_ADMIN);
        LeaveAdjustment created = adjustmentService.createAdjustment(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LeaveAdjustment>> getAllAdjustments() {
        if (securityService.isHrAdmin()) {
            return ResponseEntity.ok(adjustmentService.getAllAdjustments());
        }

        if (securityService.isManager()) {
            Long deptId = securityService.getCurrentUser().getEmployee() != null &&
                    securityService.getCurrentUser().getEmployee().getDepartment() != null
                    ? securityService.getCurrentUser().getEmployee().getDepartment().getId()
                    : null;
            if (deptId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(adjustmentService.getAdjustmentsByDepartment(deptId));
        }

        // EMPLOYEE: view only own adjustments
        Long ownEmpId = securityService.getCurrentUser().getEmployee() != null
                ? securityService.getCurrentUser().getEmployee().getId()
                : null;
        if (ownEmpId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByEmployee(ownEmpId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveAdjustment> getAdjustmentById(@PathVariable Long id) {
        LeaveAdjustment adj = adjustmentService.getAdjustmentById(id);
        securityService.validateEmployeeAccess(adj.getEmployee().getId());
        return ResponseEntity.ok(adj);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveAdjustment>> getAdjustmentsByEmployee(@PathVariable Long employeeId) {
        securityService.validateEmployeeAccess(employeeId);
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByEmployee(employeeId));
    }
}
