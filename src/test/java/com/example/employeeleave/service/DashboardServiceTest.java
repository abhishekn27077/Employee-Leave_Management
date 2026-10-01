package com.example.employeeleave.service;

import com.example.employeeleave.dto.ConflictDetailDTO;
import com.example.employeeleave.dto.ConflictType;
import com.example.employeeleave.dto.DashboardOverviewDTO;
import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.dto.TeamAvailabilityResponseDTO;
import com.example.employeeleave.entity.*;
import com.example.employeeleave.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeavePolicyRepository leavePolicyRepository;

    @Mock
    private LeaveRepository leaveRepository;

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;

    @Mock
    private AuditHistoryRepository auditHistoryRepository;

    @Mock
    private TeamAvailabilityService teamAvailabilityService;

    @Mock
    private LeaveConflictService leaveConflictService;

    @InjectMocks
    private DashboardService dashboardService;

    private Department engineering;
    private Employee employee;
    private LeaveType vacation;

    @BeforeEach
    void setUp() {
        engineering = new Department("Engineering");
        engineering.setId(1L);

        employee = new Employee("EMP001", "Alice", "alice@test.com", "123", "Dev", LocalDate.now(), engineering);
        employee.setId(10L);

        vacation = new LeaveType("Vacation", "Annual", 15);
        vacation.setId(20L);
    }

    @Test
    void testGetDashboardOverview_EmptyDatabase() {
        when(employeeRepository.count()).thenReturn(0L);
        when(departmentRepository.count()).thenReturn(0L);
        when(leaveTypeRepository.count()).thenReturn(0L);
        when(leavePolicyRepository.count()).thenReturn(0L);
        when(leaveRepository.findAllByOrderByIdDesc()).thenReturn(Collections.emptyList());
        when(leaveBalanceRepository.findAll()).thenReturn(Collections.emptyList());
        when(departmentRepository.findAll()).thenReturn(Collections.emptyList());
        when(leaveRepository.findByStatusAndEndDateGreaterThanEqualOrderByStartDateAsc(any(), any()))
                .thenReturn(Collections.emptyList());
        when(auditHistoryRepository.findAllByOrderByTimestampDesc()).thenReturn(Collections.emptyList());

        DashboardOverviewDTO overview = dashboardService.getDashboardOverview(LocalDate.of(2026, 9, 30));

        assertNotNull(overview);
        assertEquals(0, overview.getTotalEmployees());
        assertEquals(0, overview.getTotalDepartments());
        assertEquals(0, overview.getTotalLeaves());
        assertEquals(0.0, overview.getApprovalRate());
        assertEquals(0.0, overview.getUtilizationPercentage());
        assertEquals(100.0, overview.getOrganizationAvailabilityPercentage());
        assertTrue(overview.getDepartmentAvailability().isEmpty());
        assertTrue(overview.getDetectedConflicts().isEmpty());
        assertTrue(overview.getUpcomingApprovedLeaves().isEmpty());
        assertTrue(overview.getRecentActivity().isEmpty());
    }

    @Test
    void testGetDashboardOverview_PopulatedDatabase() {
        when(employeeRepository.count()).thenReturn(10L);
        when(departmentRepository.count()).thenReturn(2L);
        when(leaveTypeRepository.count()).thenReturn(3L);
        when(leavePolicyRepository.count()).thenReturn(4L);

        Leave l1 = new Leave(employee, vacation, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 3), "Trip", LeaveStatus.APPROVED);
        l1.setId(101L);
        Leave l2 = new Leave(employee, vacation, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 6), "Errand", LeaveStatus.PENDING);
        l2.setId(102L);

        when(leaveRepository.findAllByOrderByIdDesc()).thenReturn(List.of(l1, l2));

        LeaveBalance bal = new LeaveBalance(employee, vacation, 20, 5); // remaining 15
        when(leaveBalanceRepository.findAll()).thenReturn(List.of(bal));

        when(departmentRepository.findAll()).thenReturn(List.of(engineering));
        TeamAvailabilityResponseDTO availDto = new TeamAvailabilityResponseDTO(
                1L, "Engineering", LocalDate.of(2026, 9, 30), 5, 1, 4, 80.0, List.of(), List.of()
        );
        when(teamAvailabilityService.getDepartmentAvailability(eq(1L), any())).thenReturn(availDto);

        LeaveConflictResponseDTO conflictReport = new LeaveConflictResponseDTO();
        conflictReport.setCanApprove(true);
        when(leaveConflictService.evaluateLeave(eq(l2), any())).thenReturn(conflictReport);

        when(leaveRepository.findByStatusAndEndDateGreaterThanEqualOrderByStartDateAsc(eq(LeaveStatus.APPROVED), any()))
                .thenReturn(List.of(l1));

        AuditHistory audit = new AuditHistory("SYSTEM", "LEAVE_APPROVED", "LEAVE", 101L, "PENDING", "APPROVED", "Approved", LocalDateTime.now());
        when(auditHistoryRepository.findAllByOrderByTimestampDesc()).thenReturn(List.of(audit));

        DashboardOverviewDTO overview = dashboardService.getDashboardOverview(LocalDate.of(2026, 9, 30));

        assertNotNull(overview);
        assertEquals(10, overview.getTotalEmployees());
        assertEquals(2, overview.getTotalDepartments());
        assertEquals(2, overview.getTotalLeaves());
        assertEquals(1, overview.getApprovedLeaves());
        assertEquals(1, overview.getPendingLeaves());
        assertEquals(50.0, overview.getApprovalRate()); // 1 of 2

        assertEquals(20, overview.getTotalEntitlementDays());
        assertEquals(5, overview.getTotalUsedDays());
        assertEquals(15, overview.getTotalRemainingDays());
        assertEquals(25.0, overview.getUtilizationPercentage()); // 5 / 20 * 100

        assertEquals(80.0, overview.getOrganizationAvailabilityPercentage());
        assertEquals(1, overview.getDepartmentAvailability().size());
        assertEquals(1, overview.getUpcomingApprovedLeaves().size());
        assertEquals(1, overview.getRecentActivity().size());
        assertEquals(0, overview.getPendingWithConflictsCount());
    }

    @Test
    void testGetDashboardOverview_ConflictDetected() {
        when(employeeRepository.count()).thenReturn(5L);
        when(departmentRepository.count()).thenReturn(1L);
        when(leaveTypeRepository.count()).thenReturn(1L);
        when(leavePolicyRepository.count()).thenReturn(1L);

        Leave pending = new Leave(employee, vacation, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 6), "Errand", LeaveStatus.PENDING);
        pending.setId(200L);
        when(leaveRepository.findAllByOrderByIdDesc()).thenReturn(List.of(pending));

        when(leaveBalanceRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findAll()).thenReturn(List.of(engineering));
        TeamAvailabilityResponseDTO availDto = new TeamAvailabilityResponseDTO(
                1L, "Engineering", LocalDate.of(2026, 9, 30), 5, 0, 5, 100.0, List.of(), List.of()
        );
        when(teamAvailabilityService.getDepartmentAvailability(eq(1L), any())).thenReturn(availDto);

        LeaveConflictResponseDTO conflictReport = new LeaveConflictResponseDTO();
        conflictReport.setCanApprove(false);
        conflictReport.setConflicts(List.of(new ConflictDetailDTO(ConflictType.INSUFFICIENT_BALANCE, "Insufficient leave balance", true)));
        when(leaveConflictService.evaluateLeave(eq(pending), any())).thenReturn(conflictReport);

        when(leaveRepository.findByStatusAndEndDateGreaterThanEqualOrderByStartDateAsc(any(), any()))
                .thenReturn(List.of());
        when(auditHistoryRepository.findAllByOrderByTimestampDesc()).thenReturn(List.of());

        DashboardOverviewDTO overview = dashboardService.getDashboardOverview(LocalDate.of(2026, 9, 30));

        assertNotNull(overview);
        assertEquals(1, overview.getPendingWithConflictsCount());
        assertEquals(1, overview.getDetectedConflicts().size());
        assertEquals(200L, overview.getDetectedConflicts().get(0).getLeaveId());
        assertFalse(overview.getDetectedConflicts().get(0).isCanApprove());
    }
}
