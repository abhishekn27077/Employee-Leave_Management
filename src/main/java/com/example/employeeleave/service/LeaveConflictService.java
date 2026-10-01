package com.example.employeeleave.service;

import com.example.employeeleave.dto.ConflictDetailDTO;
import com.example.employeeleave.dto.ConflictType;
import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.dto.LeaveRequestDTO;
import com.example.employeeleave.dto.TeamAvailabilitySummaryDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.entity.LeavePolicy;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveBalanceRepository;
import com.example.employeeleave.repository.LeaveRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class LeaveConflictService {

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeavePolicyService leavePolicyService;
    private final HolidayService holidayService;

    public LeaveConflictService(LeaveRepository leaveRepository,
                                EmployeeRepository employeeRepository,
                                LeaveTypeRepository leaveTypeRepository,
                                LeaveBalanceRepository leaveBalanceRepository,
                                LeavePolicyService leavePolicyService,
                                HolidayService holidayService) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.leavePolicyService = leavePolicyService;
        this.holidayService = holidayService;
    }

    @Transactional(readOnly = true)
    public LeaveConflictResponseDTO evaluateLeave(Long leaveId, Double overrideThreshold) {
        Leave leave = leaveRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found with id: " + leaveId));
        return evaluateInternal(
                leave.getId(),
                leave.getEmployee(),
                leave.getLeaveType(),
                leave.getStartDate(),
                leave.getEndDate(),
                overrideThreshold
        );
    }

    @Transactional(readOnly = true)
    public LeaveConflictResponseDTO evaluateLeave(Leave leave, Double overrideThreshold) {
        return evaluateInternal(
                leave.getId(),
                leave.getEmployee(),
                leave.getLeaveType(),
                leave.getStartDate(),
                leave.getEndDate(),
                overrideThreshold
        );
    }

    @Transactional(readOnly = true)
    public LeaveConflictResponseDTO evaluateRequest(LeaveRequestDTO request, Double overrideThreshold) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId()));
        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        return evaluateInternal(
                null,
                employee,
                leaveType,
                request.getStartDate(),
                request.getEndDate(),
                overrideThreshold
        );
    }

    private LeaveConflictResponseDTO evaluateInternal(Long leaveId,
                                                      Employee employee,
                                                      LeaveType leaveType,
                                                      LocalDate startDate,
                                                      LocalDate endDate,
                                                      Double overrideThreshold) {
        LeaveConflictResponseDTO response = new LeaveConflictResponseDTO();
        response.setLeaveId(leaveId);
        response.setEmployeeId(employee != null ? employee.getId() : null);
        response.setEmployeeName(employee != null ? employee.getName() : null);
        response.setLeaveTypeId(leaveType != null ? leaveType.getId() : null);
        response.setLeaveTypeName(leaveType != null ? leaveType.getName() : null);

        Department department = employee != null ? employee.getDepartment() : null;
        if (department != null) {
            response.setDepartmentId(department.getId());
            response.setDepartmentName(department.getName());
        }

        response.setStartDate(startDate);
        response.setEndDate(endDate);

        List<ConflictDetailDTO> conflicts = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // 1. Basic Date Validity Check
        if (startDate == null || endDate == null) {
            conflicts.add(new ConflictDetailDTO(ConflictType.POLICY_VIOLATION, "Start date and end date are required.", true));
            response.setConflicts(conflicts);
            response.setCanApprove(false);
            return response;
        }

        if (endDate.isBefore(startDate)) {
            conflicts.add(new ConflictDetailDTO(ConflictType.POLICY_VIOLATION, "End date cannot be before start date.", true));
            response.setConflicts(conflicts);
            response.setCanApprove(false);
            return response;
        }

        int totalDays = (int) ChronoUnit.DAYS.between(startDate, endDate) + 1;
        response.setCalculatedTotalDays(totalDays);

        // 2. Holiday Evaluation
        int holidayCount = (int) holidayService.countHolidaysBetween(startDate, endDate);
        response.setHolidayCount(holidayCount);

        int effectiveDays = totalDays - holidayCount;
        response.setCalculatedEffectiveDays(Math.max(0, effectiveDays));

        if (effectiveDays <= 0) {
            conflicts.add(new ConflictDetailDTO(
                    ConflictType.HOLIDAY_CONFLICT,
                    "The requested leave dates fall entirely on official public holidays. No leave deduction is needed.",
                    true
            ));
        } else if (holidayCount > 0) {
            warnings.add("Requested leave period includes " + holidayCount + " official public holiday(s) which will not be deducted from leave balance.");
        }

        // 3. Applicable Leave Policy Lookup
        Long deptId = department != null ? department.getId() : null;
        Optional<LeavePolicy> policyOpt = leavePolicyService.findApplicablePolicy(leaveType.getId(), deptId);

        // 4. Policy Restriction: Maximum Consecutive Days
        if (policyOpt.isPresent()) {
            LeavePolicy policy = policyOpt.get();
            if (policy.getMaxConsecutiveDays() != null && totalDays > policy.getMaxConsecutiveDays()) {
                conflicts.add(new ConflictDetailDTO(
                        ConflictType.POLICY_VIOLATION,
                        "Requested leave duration (" + totalDays + " days) exceeds maximum consecutive days allowed by policy (" + policy.getMaxConsecutiveDays() + " days).",
                        true
                ));
            }
        }

        // 5. Leave Balance Verification (Read-only, non-mutating)
        int remainingBalance = 0;
        Optional<LeaveBalance> balanceOpt = leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(employee.getId(), leaveType.getId());
        if (balanceOpt.isPresent()) {
            remainingBalance = balanceOpt.get().getRemainingBalance();
        } else {
            // If balance record is not yet initialized in DB, deduce default from policy or leaveType
            if (policyOpt.isPresent() && policyOpt.get().getEntitlement() != null) {
                remainingBalance = policyOpt.get().getEntitlement();
            } else if (leaveType.getDefaultDays() != null) {
                remainingBalance = leaveType.getDefaultDays();
            }
        }
        response.setRemainingBalance(remainingBalance);

        if (effectiveDays > 0 && remainingBalance < effectiveDays) {
            conflicts.add(new ConflictDetailDTO(
                    ConflictType.INSUFFICIENT_BALANCE,
                    "Insufficient leave balance for '" + leaveType.getName() + "'. Required: " + effectiveDays + " days, Available balance: " + remainingBalance + " days.",
                    true
            ));
        }

        // 6. Overlapping Leave Verification (APPROVED or PENDING)
        List<Leave> overlappingLeaves = leaveRepository.findOverlappingLeaves(
                employee.getId(),
                Arrays.asList(LeaveStatus.APPROVED, LeaveStatus.PENDING),
                startDate,
                endDate,
                leaveId
        );

        for (Leave ov : overlappingLeaves) {
            conflicts.add(new ConflictDetailDTO(
                    ConflictType.OVERLAPPING_LEAVE,
                    "Overlapping leave found: Leave #" + ov.getId() + " (" + ov.getStatus() + ") from " +
                            ov.getStartDate() + " to " + ov.getEndDate() + " for '" +
                            (ov.getLeaveType() != null ? ov.getLeaveType().getName() : "Leave") + "'.",
                    true
            ));
        }

        // 7. Department/Team Availability & Minimum Threshold
        if (department != null) {
            Double threshold = null;
            if (overrideThreshold != null) {
                threshold = overrideThreshold;
            } else if (policyOpt.isPresent() && policyOpt.get().getMinAvailabilityPercentage() != null) {
                threshold = policyOpt.get().getMinAvailabilityPercentage();
            }

            List<Employee> deptEmployees = employeeRepository.findByDepartmentId(department.getId());
            int totalDeptEmployees = deptEmployees.size();

            if (totalDeptEmployees > 0) {
                double minProjected = 100.0;
                LocalDate worstDate = startDate;
                boolean thresholdViolated = false;

                LocalDate curr = startDate;
                while (!curr.isAfter(endDate)) {
                    List<Leave> approvedOnDate = leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(
                            department.getId(),
                            LeaveStatus.APPROVED,
                            curr
                    );

                    int approvedCount = approvedOnDate.size();
                    boolean alreadyApproved = approvedOnDate.stream()
                            .anyMatch(l -> l.getEmployee() != null && l.getEmployee().getId().equals(employee.getId()));

                    int projectedApproved = alreadyApproved ? approvedCount : approvedCount + 1;
                    int projectedAvailable = Math.max(0, totalDeptEmployees - projectedApproved);
                    double projectedPercentage = Math.round((projectedAvailable * 100.0 / totalDeptEmployees) * 10.0) / 10.0;

                    if (projectedPercentage < minProjected) {
                        minProjected = projectedPercentage;
                        worstDate = curr;
                    }

                    if (threshold != null && projectedPercentage < threshold) {
                        thresholdViolated = true;
                    }

                    curr = curr.plusDays(1);
                }

                TeamAvailabilitySummaryDTO availSummary = new TeamAvailabilitySummaryDTO(
                        department.getId(),
                        department.getName(),
                        totalDeptEmployees,
                        minProjected,
                        threshold,
                        worstDate
                );
                response.setAvailabilityInfo(availSummary);

                if (thresholdViolated) {
                    conflicts.add(new ConflictDetailDTO(
                            ConflictType.TEAM_AVAILABILITY_CONFLICT,
                            "Department '" + department.getName() + "' availability on " + worstDate +
                                    " would drop to " + minProjected + "%, which is below the configured threshold of " + threshold + "%.",
                            true
                    ));
                }
            } else {
                response.setAvailabilityInfo(new TeamAvailabilitySummaryDTO(
                        department.getId(),
                        department.getName(),
                        0,
                        100.0,
                        threshold,
                        startDate
                ));
            }
        }

        response.setConflicts(conflicts);
        response.setWarnings(warnings);
        response.setCanApprove(conflicts.isEmpty());

        return response;
    }
}
