package com.example.employeeleave.service;

import com.example.employeeleave.dto.DashboardOverviewDTO;
import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.dto.TeamAvailabilityResponseDTO;
import com.example.employeeleave.entity.*;
import com.example.employeeleave.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeavePolicyRepository leavePolicyRepository;
    private final LeaveRepository leaveRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final AuditHistoryRepository auditHistoryRepository;
    private final TeamAvailabilityService teamAvailabilityService;
    private final LeaveConflictService leaveConflictService;

    public DashboardService(EmployeeRepository employeeRepository,
                            DepartmentRepository departmentRepository,
                            LeaveTypeRepository leaveTypeRepository,
                            LeavePolicyRepository leavePolicyRepository,
                            LeaveRepository leaveRepository,
                            LeaveBalanceRepository leaveBalanceRepository,
                            AuditHistoryRepository auditHistoryRepository,
                            TeamAvailabilityService teamAvailabilityService,
                            LeaveConflictService leaveConflictService) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leavePolicyRepository = leavePolicyRepository;
        this.leaveRepository = leaveRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.auditHistoryRepository = auditHistoryRepository;
        this.teamAvailabilityService = teamAvailabilityService;
        this.leaveConflictService = leaveConflictService;
    }

    @Transactional(readOnly = true)
    public DashboardOverviewDTO getDashboardOverview(LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        DashboardOverviewDTO dto = new DashboardOverviewDTO();

        // 1. Structure counts
        int totalEmployees = (int) employeeRepository.count();
        int totalDepartments = (int) departmentRepository.count();
        int totalLeaveTypes = (int) leaveTypeRepository.count();
        int totalPolicies = (int) leavePolicyRepository.count();

        dto.setTotalEmployees(totalEmployees);
        dto.setTotalDepartments(totalDepartments);
        dto.setTotalLeaveTypes(totalLeaveTypes);
        dto.setTotalPolicies(totalPolicies);

        // 2. Leave requests
        List<Leave> allLeaves = leaveRepository.findAllByOrderByIdDesc();
        int totalLeaves = allLeaves.size();
        int pendingCount = 0;
        int approvedCount = 0;
        int rejectedCount = 0;
        int cancelledCount = 0;

        List<Leave> pendingLeaves = new ArrayList<>();
        for (Leave l : allLeaves) {
            if (l.getStatus() == LeaveStatus.PENDING) {
                pendingCount++;
                pendingLeaves.add(l);
            } else if (l.getStatus() == LeaveStatus.APPROVED) {
                approvedCount++;
            } else if (l.getStatus() == LeaveStatus.REJECTED) {
                rejectedCount++;
            } else if (l.getStatus() == LeaveStatus.CANCELLED) {
                cancelledCount++;
            }
        }

        dto.setTotalLeaves(totalLeaves);
        dto.setPendingLeaves(pendingCount);
        dto.setApprovedLeaves(approvedCount);
        dto.setRejectedLeaves(rejectedCount);
        dto.setCancelledLeaves(cancelledCount);

        double approvalRate = totalLeaves > 0
                ? Math.round((approvedCount * 100.0 / totalLeaves) * 10.0) / 10.0
                : 0.0;
        dto.setApprovalRate(approvalRate);

        dto.setRecentLeaves(allLeaves.stream().limit(6).collect(Collectors.toList()));

        // 3. Balance and utilization
        List<LeaveBalance> allBalances = leaveBalanceRepository.findAll();
        int totalEntitlement = 0;
        int totalUsed = 0;
        int totalRemaining = 0;

        for (LeaveBalance b : allBalances) {
            totalEntitlement += b.getEntitlement();
            totalUsed += b.getUsedDays();
            totalRemaining += b.getRemainingBalance();
        }

        dto.setTotalEntitlementDays(totalEntitlement);
        dto.setTotalUsedDays(totalUsed);
        dto.setTotalRemainingDays(totalRemaining);

        double utilizationPercentage = totalEntitlement > 0
                ? Math.round((totalUsed * 100.0 / totalEntitlement) * 10.0) / 10.0
                : 0.0;
        dto.setUtilizationPercentage(utilizationPercentage);

        // 4. Team availability (today)
        dto.setAvailabilityDate(targetDate);
        List<Department> departments = departmentRepository.findAll();
        List<DashboardOverviewDTO.DepartmentAvailabilityItemDTO> deptAvailabilities = new ArrayList<>();

        int sumDeptTotalEmployees = 0;
        int sumDeptOnLeave = 0;
        int sumDeptAvailable = 0;

        for (Department dept : departments) {
            TeamAvailabilityResponseDTO avail = teamAvailabilityService.getDepartmentAvailability(dept.getId(), targetDate);
            deptAvailabilities.add(new DashboardOverviewDTO.DepartmentAvailabilityItemDTO(
                    dept.getId(),
                    dept.getName(),
                    avail.getTotalEmployees(),
                    avail.getOnLeaveCount(),
                    avail.getAvailableCount(),
                    avail.getAvailabilityPercentage()
            ));

            sumDeptTotalEmployees += avail.getTotalEmployees();
            sumDeptOnLeave += avail.getOnLeaveCount();
            sumDeptAvailable += avail.getAvailableCount();
        }

        dto.setDepartmentAvailability(deptAvailabilities);
        dto.setTotalAvailableEmployees(sumDeptAvailable);
        dto.setTotalOnLeaveEmployees(sumDeptOnLeave);

        double orgAvailabilityPercentage = sumDeptTotalEmployees > 0
                ? Math.round((sumDeptAvailable * 100.0 / sumDeptTotalEmployees) * 10.0) / 10.0
                : 100.0;
        dto.setOrganizationAvailabilityPercentage(orgAvailabilityPercentage);

        // 5. Detected leave conflicts on pending leaves
        List<DashboardOverviewDTO.ConflictSummaryDTO> detectedConflicts = new ArrayList<>();
        for (Leave pendingLeave : pendingLeaves) {
            try {
                LeaveConflictResponseDTO conflictReport = leaveConflictService.evaluateLeave(pendingLeave, null);
                if (!conflictReport.isCanApprove() || !conflictReport.getConflicts().isEmpty()) {
                    detectedConflicts.add(new DashboardOverviewDTO.ConflictSummaryDTO(
                            pendingLeave.getId(),
                            pendingLeave.getEmployee() != null ? pendingLeave.getEmployee().getName() : "Unknown",
                            pendingLeave.getEmployee() != null && pendingLeave.getEmployee().getDepartment() != null
                                    ? pendingLeave.getEmployee().getDepartment().getName() : "Unassigned",
                            pendingLeave.getLeaveType() != null ? pendingLeave.getLeaveType().getName() : "General",
                            pendingLeave.getStartDate(),
                            pendingLeave.getEndDate(),
                            conflictReport.isCanApprove(),
                            conflictReport.getConflicts(),
                            conflictReport.getWarnings()
                    ));
                }
            } catch (Exception ignored) {
                // If evaluation fails on edge cases, safely proceed
            }
        }
        dto.setDetectedConflicts(detectedConflicts);
        dto.setPendingWithConflictsCount(detectedConflicts.size());

        // 6. Upcoming approved leaves
        List<Leave> upcomingLeaves = leaveRepository.findByStatusAndEndDateGreaterThanEqualOrderByStartDateAsc(
                LeaveStatus.APPROVED,
                targetDate
        );
        List<DashboardOverviewDTO.UpcomingLeaveDTO> upcomingDTOs = upcomingLeaves.stream()
                .limit(8)
                .map(l -> {
                    int days = (int) ChronoUnit.DAYS.between(l.getStartDate(), l.getEndDate()) + 1;
                    return new DashboardOverviewDTO.UpcomingLeaveDTO(
                            l.getId(),
                            l.getEmployee() != null ? l.getEmployee().getId() : null,
                            l.getEmployee() != null ? l.getEmployee().getName() : "Unknown",
                            l.getEmployee() != null && l.getEmployee().getDepartment() != null
                                    ? l.getEmployee().getDepartment().getName() : "Unassigned",
                            l.getLeaveType() != null ? l.getLeaveType().getName() : "Leave",
                            l.getStartDate(),
                            l.getEndDate(),
                            days,
                            l.getReason()
                    );
                })
                .collect(Collectors.toList());
        dto.setUpcomingApprovedLeaves(upcomingDTOs);

        // 7. Recent activity from Audit History
        List<AuditHistory> recentAudits = auditHistoryRepository.findAllByOrderByTimestampDesc();
        List<DashboardOverviewDTO.RecentActivityDTO> activityDTOs = recentAudits.stream()
                .limit(8)
                .map(a -> new DashboardOverviewDTO.RecentActivityDTO(
                        a.getId(),
                        a.getActor(),
                        a.getAction(),
                        a.getEntityType(),
                        a.getEntityId(),
                        a.getOldValue(),
                        a.getNewValue(),
                        a.getDescription(),
                        a.getTimestamp()
                ))
                .collect(Collectors.toList());
        dto.setRecentActivity(activityDTOs);

        return dto;
    }
}
