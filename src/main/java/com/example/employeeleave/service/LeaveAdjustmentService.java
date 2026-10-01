package com.example.employeeleave.service;

import com.example.employeeleave.dto.LeaveAdjustmentRequestDTO;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.LeaveAdjustment;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveAdjustmentRepository;
import com.example.employeeleave.repository.LeaveBalanceRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LeaveAdjustmentService {

    private final LeaveAdjustmentRepository leaveAdjustmentRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceService leaveBalanceService;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final AuditHistoryService auditHistoryService;

    public LeaveAdjustmentService(LeaveAdjustmentRepository leaveAdjustmentRepository,
                                  EmployeeRepository employeeRepository,
                                  LeaveTypeRepository leaveTypeRepository,
                                  LeaveBalanceService leaveBalanceService,
                                  LeaveBalanceRepository leaveBalanceRepository,
                                  AuditHistoryService auditHistoryService) {
        this.leaveAdjustmentRepository = leaveAdjustmentRepository;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveBalanceService = leaveBalanceService;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.auditHistoryService = auditHistoryService;
    }

    @Transactional
    public LeaveAdjustment createAdjustment(LeaveAdjustmentRequestDTO request) {
        validateRequest(request);

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId()));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        LeaveBalance balance = leaveBalanceService.getOrCreateBalance(employee, leaveType);

        int oldRemaining = balance.getRemainingBalance();
        int oldEntitlement = balance.getEntitlement();
        int adjDays = request.getAdjustmentDays();

        if (adjDays < 0 && (oldRemaining + adjDays < 0)) {
            throw new BadRequestException("Cannot apply negative adjustment of " + adjDays +
                    " days: remaining balance cannot become negative (current available: " + oldRemaining + ").");
        }

        balance.setEntitlement(oldEntitlement + adjDays);
        leaveBalanceRepository.save(balance);
        int newRemaining = balance.getRemainingBalance();

        LeaveAdjustment adjustment = new LeaveAdjustment(
                employee,
                leaveType,
                adjDays,
                request.getReason().trim(),
                request.getReference() != null ? request.getReference().trim() : null,
                LocalDateTime.now()
        );
        LeaveAdjustment savedAdjustment = leaveAdjustmentRepository.save(adjustment);

        String actor = (request.getActor() != null && !request.getActor().trim().isEmpty()) ? request.getActor().trim() : "SYSTEM";
        auditHistoryService.recordAudit(
                actor,
                "LEAVE_ADJUSTED",
                "LEAVE_ADJUSTMENT",
                savedAdjustment.getId(),
                "Remaining: " + oldRemaining + ", Entitlement: " + oldEntitlement,
                "Remaining: " + newRemaining + ", Entitlement: " + (oldEntitlement + adjDays),
                "Adjustment of " + (adjDays > 0 ? "+" : "") + adjDays + " days for " + employee.getName() + " (" + leaveType.getName() + "). Reason: " + request.getReason()
        );

        return savedAdjustment;
    }

    @Transactional(readOnly = true)
    public List<LeaveAdjustment> getAllAdjustments() {
        return leaveAdjustmentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public LeaveAdjustment getAdjustmentById(Long id) {
        return leaveAdjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave adjustment not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<LeaveAdjustment> getAdjustmentsByEmployee(Long employeeId) {
        if (!employeeRepository.existsById(employeeId)) {
            throw new ResourceNotFoundException("Employee not found with id: " + employeeId);
        }
        return leaveAdjustmentRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    private void validateRequest(LeaveAdjustmentRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Leave adjustment request body cannot be null");
        }
        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Employee ID is required");
        }
        if (request.getLeaveTypeId() == null) {
            throw new BadRequestException("Leave type ID is required");
        }
        if (request.getAdjustmentDays() == null || request.getAdjustmentDays() == 0) {
            throw new BadRequestException("Adjustment days is required and cannot be zero");
        }
        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new BadRequestException("Reason is required");
        }
    }
}
