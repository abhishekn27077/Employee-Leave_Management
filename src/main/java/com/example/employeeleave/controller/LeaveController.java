package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.dto.LeaveRequestDTO;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.security.SecurityService;
import com.example.employeeleave.service.LeaveConflictService;
import com.example.employeeleave.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;
    private final LeaveConflictService leaveConflictService;
    private final SecurityService securityService;

    public LeaveController(LeaveService leaveService,
                           LeaveConflictService leaveConflictService,
                           SecurityService securityService) {
        this.leaveService = leaveService;
        this.leaveConflictService = leaveConflictService;
        this.securityService = securityService;
    }

    @PostMapping
    public ResponseEntity<Leave> applyLeave(@Valid @RequestBody LeaveRequestDTO request) {
        securityService.validateCanApplyLeave(request.getEmployeeId());
        Leave createdLeave = leaveService.applyLeave(request);
        return new ResponseEntity<>(createdLeave, HttpStatus.CREATED);
    }

    @PostMapping("/evaluate-conflicts")
    public ResponseEntity<LeaveConflictResponseDTO> evaluateConflicts(
            @Valid @RequestBody LeaveRequestDTO request,
            @RequestParam(required = false) Double minAvailabilityThreshold) {
        securityService.validateEmployeeAccess(request.getEmployeeId());
        LeaveConflictResponseDTO evaluation = leaveConflictService.evaluateRequest(request, minAvailabilityThreshold);
        return ResponseEntity.ok(evaluation);
    }

    @GetMapping
    public ResponseEntity<List<Leave>> getAllLeaves(@RequestParam(required = false) Long employeeId) {
        if (employeeId != null) {
            securityService.validateEmployeeAccess(employeeId);
            return ResponseEntity.ok(leaveService.getLeavesByEmployeeId(employeeId));
        }

        if (securityService.isHrAdmin()) {
            return ResponseEntity.ok(leaveService.getAllLeaves());
        }

        if (securityService.isManager()) {
            Long deptId = securityService.getCurrentUser().getEmployee() != null &&
                    securityService.getCurrentUser().getEmployee().getDepartment() != null
                    ? securityService.getCurrentUser().getEmployee().getDepartment().getId()
                    : null;
            if (deptId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(leaveService.getLeavesByDepartmentId(deptId));
        }

        // EMPLOYEE role: can only view their own leave requests
        Long ownEmployeeId = securityService.getCurrentUser().getEmployee() != null
                ? securityService.getCurrentUser().getEmployee().getId()
                : null;
        if (ownEmployeeId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(leaveService.getLeavesByEmployeeId(ownEmployeeId));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<Leave>> getLeavesByEmployeeId(@PathVariable Long employeeId) {
        securityService.validateEmployeeAccess(employeeId);
        return ResponseEntity.ok(leaveService.getLeavesByEmployeeId(employeeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Leave> getLeaveById(@PathVariable Long id) {
        Leave leave = leaveService.getLeaveById(id);
        securityService.validateEmployeeAccess(leave.getEmployee().getId());
        return ResponseEntity.ok(leave);
    }

    @GetMapping("/{id}/conflicts")
    public ResponseEntity<LeaveConflictResponseDTO> getLeaveConflicts(
            @PathVariable Long id,
            @RequestParam(required = false) Double minAvailabilityThreshold) {
        Leave leave = leaveService.getLeaveById(id);
        securityService.validateEmployeeAccess(leave.getEmployee().getId());
        LeaveConflictResponseDTO evaluation = leaveConflictService.evaluateLeave(id, minAvailabilityThreshold);
        return ResponseEntity.ok(evaluation);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Leave> approveLeave(@PathVariable Long id) {
        Leave leave = leaveService.getLeaveById(id);
        securityService.validateCanApproveOrReject(leave);
        Leave approvedLeave = leaveService.approveLeave(id);
        return ResponseEntity.ok(approvedLeave);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Leave> rejectLeave(@PathVariable Long id) {
        Leave leave = leaveService.getLeaveById(id);
        securityService.validateCanApproveOrReject(leave);
        Leave rejectedLeave = leaveService.rejectLeave(id);
        return ResponseEntity.ok(rejectedLeave);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Leave> cancelLeave(@PathVariable Long id) {
        Leave leave = leaveService.getLeaveById(id);
        securityService.validateCanCancelLeave(leave);
        Leave cancelledLeave = leaveService.cancelLeave(id);
        return ResponseEntity.ok(cancelledLeave);
    }
}
