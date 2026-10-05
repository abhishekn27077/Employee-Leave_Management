package com.example.employeeleave.service;

import com.example.employeeleave.dto.ConflictDetailDTO;
import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.dto.LeaveRequestDTO;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.LeaveConflictException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LeaveService {

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceService leaveBalanceService;
    private final HolidayService holidayService;
    private final LeaveConflictService leaveConflictService;
    private final AuditHistoryService auditHistoryService;

    public LeaveService(LeaveRepository leaveRepository,
                        EmployeeRepository employeeRepository,
                        LeaveTypeRepository leaveTypeRepository,
                        LeaveBalanceService leaveBalanceService,
                        HolidayService holidayService,
                        LeaveConflictService leaveConflictService,
                        AuditHistoryService auditHistoryService) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveBalanceService = leaveBalanceService;
        this.holidayService = holidayService;
        this.leaveConflictService = leaveConflictService;
        this.auditHistoryService = auditHistoryService;
    }

    public Leave applyLeave(LeaveRequestDTO request) {
        validateLeaveRequest(request);

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId()));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        int totalDays = (int) ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        long holidayCount = holidayService.countHolidaysBetween(request.getStartDate(), request.getEndDate());
        int effectiveDays = (int) (totalDays - holidayCount);
        if (effectiveDays <= 0) {
            throw new BadRequestException("The requested dates fall entirely on official public holidays. No leave deduction is needed.");
        }

        // Verify employee has sufficient remaining balance for effective days
        leaveBalanceService.checkBalance(employee, leaveType, effectiveDays);

        Leave leave = new Leave();
        leave.setEmployee(employee);
        leave.setLeaveType(leaveType);
        leave.setStartDate(request.getStartDate());
        leave.setEndDate(request.getEndDate());
        leave.setReason(request.getReason().trim());
        leave.setStatus(LeaveStatus.PENDING);
        leave.setAppliedAt(LocalDateTime.now());

        Leave savedLeave = leaveRepository.save(leave);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "LEAVE_SUBMITTED",
                "LEAVE",
                savedLeave.getId(),
                null,
                "PENDING",
                "Leave application submitted for " + employee.getName() + " (" + savedLeave.getStartDate() + " to " + savedLeave.getEndDate() + ")"
        );

        return savedLeave;
    }

    public List<Leave> getAllLeaves() {
        return leaveRepository.findAll();
    }

    public List<Leave> getLeavesByEmployeeId(Long employeeId) {
        return leaveRepository.findByEmployeeIdOrderByIdDesc(employeeId);
    }

    public List<Leave> getLeavesByDepartmentId(Long departmentId) {
        return leaveRepository.findByEmployeeDepartmentIdOrderByIdDesc(departmentId);
    }

    public Leave getLeaveById(Long id) {
        return leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found with id: " + id));
    }

    @Transactional
    public Leave approveLeave(Long id) {
        Leave leave = getLeaveById(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Cannot approve leave with status: " + leave.getStatus() + ". Only PENDING leaves can be approved.");
        }

        // Run Conflict Detection Engine before approving
        LeaveConflictResponseDTO evaluation = leaveConflictService.evaluateLeave(leave, null);
        if (!evaluation.isCanApprove()) {
            String conflictSummary = evaluation.getConflicts().stream()
                    .map(ConflictDetailDTO::getMessage)
                    .collect(Collectors.joining("; "));
            throw new LeaveConflictException("Cannot approve leave due to conflict(s): " + conflictSummary, evaluation.getConflicts());
        }

        int totalDays = (int) ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
        long holidayCount = holidayService.countHolidaysBetween(leave.getStartDate(), leave.getEndDate());
        int effectiveDays = Math.max(1, (int) (totalDays - holidayCount));
        leaveBalanceService.deductApprovedDays(leave.getEmployee(), leave.getLeaveType(), effectiveDays);

        leave.setStatus(LeaveStatus.APPROVED);
        Leave saved = leaveRepository.save(leave);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "LEAVE_APPROVED",
                "LEAVE",
                saved.getId(),
                "PENDING",
                "APPROVED",
                "Leave approved for " + leave.getEmployee().getName() + " (" + effectiveDays + " day(s) deducted)"
        );

        return saved;
    }

    @Transactional
    public Leave rejectLeave(Long id) {
        Leave leave = getLeaveById(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Cannot reject leave with status: " + leave.getStatus() + ". Only PENDING leaves can be rejected.");
        }
        leave.setStatus(LeaveStatus.REJECTED);
        Leave saved = leaveRepository.save(leave);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "LEAVE_REJECTED",
                "LEAVE",
                saved.getId(),
                "PENDING",
                "REJECTED",
                "Leave rejected for " + leave.getEmployee().getName()
        );

        return saved;
    }

    @Transactional
    public Leave cancelLeave(Long id) {
        Leave leave = getLeaveById(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Cannot cancel leave with status: " + leave.getStatus() + ". Only PENDING leaves can be cancelled.");
        }
        leave.setStatus(LeaveStatus.CANCELLED);
        Leave saved = leaveRepository.save(leave);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "LEAVE_CANCELLED",
                "LEAVE",
                saved.getId(),
                "PENDING",
                "CANCELLED",
                "Leave cancelled for " + leave.getEmployee().getName()
        );

        return saved;
    }

    private void validateLeaveRequest(LeaveRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Leave request body cannot be null");
        }
        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Employee ID is required");
        }
        if (request.getLeaveTypeId() == null) {
            throw new BadRequestException("Leave type ID is required");
        }
        if (request.getStartDate() == null) {
            throw new BadRequestException("Start date is required");
        }
        if (request.getEndDate() == null) {
            throw new BadRequestException("End date is required");
        }
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date cannot be before start date");
        }
        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new BadRequestException("Reason cannot be blank");
        }
    }
}
