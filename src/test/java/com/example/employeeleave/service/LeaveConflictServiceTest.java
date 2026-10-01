package com.example.employeeleave.service;

import com.example.employeeleave.dto.ConflictType;
import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.entity.LeavePolicy;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveBalanceRepository;
import com.example.employeeleave.repository.LeaveRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaveConflictServiceTest {

    @Mock
    private LeaveRepository leaveRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;

    @Mock
    private LeavePolicyService leavePolicyService;

    @Mock
    private HolidayService holidayService;

    @InjectMocks
    private LeaveConflictService leaveConflictService;

    private Department department;
    private Employee employee;
    private LeaveType leaveType;
    private Leave leave;

    @BeforeEach
    void setUp() {
        department = new Department("Engineering");
        department.setId(1L);

        employee = new Employee("EMP001", "Alice Smith", "alice@company.com", "555-1234", "Engineer", LocalDate.of(2025, 1, 1), department);
        employee.setId(10L);

        leaveType = new LeaveType("Casual Leave", "Casual paid time off", 10);
        leaveType.setId(5L);

        leave = new Leave(
                employee,
                leaveType,
                LocalDate.of(2026, 11, 2),
                LocalDate.of(2026, 11, 4),
                "Rest and relaxation",
                LeaveStatus.PENDING,
                LocalDateTime.now()
        );
        leave.setId(100L);
    }

    @Test
    void testEvaluate_ValidLeave_NoConflict() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(0L);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.empty());

        LeaveBalance balance = new LeaveBalance(employee, leaveType, 10, 0);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));

        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(Collections.emptyList());

        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), any()))
                .thenReturn(Collections.emptyList());

        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertTrue(result.isCanApprove());
        assertTrue(result.getConflicts().isEmpty());
        assertEquals(3, result.getCalculatedTotalDays());
        assertEquals(3, result.getCalculatedEffectiveDays());
        assertEquals(10, result.getRemainingBalance());
    }

    @Test
    void testEvaluate_InsufficientBalance_ConflictDetected() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(0L);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.empty());

        // Balance only has 1 remaining day, but 3 days requested
        LeaveBalance lowBalance = new LeaveBalance(employee, leaveType, 10, 9);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(lowBalance));

        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(Collections.emptyList());
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), any()))
                .thenReturn(Collections.emptyList());

        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertFalse(result.isCanApprove());
        assertEquals(1, result.getConflicts().size());
        assertEquals(ConflictType.INSUFFICIENT_BALANCE.name(), result.getConflicts().get(0).getType());
        assertTrue(result.getConflicts().get(0).getMessage().contains("Insufficient leave balance"));
    }

    @Test
    void testEvaluate_OverlappingLeave_ConflictDetected() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(0L);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.empty());

        LeaveBalance balance = new LeaveBalance(employee, leaveType, 10, 0);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));

        Leave existingLeave = new Leave(employee, leaveType, LocalDate.of(2026, 11, 3), LocalDate.of(2026, 11, 5), "Overlap", LeaveStatus.APPROVED, LocalDateTime.now());
        existingLeave.setId(101L);

        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(List.of(existingLeave));
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), any()))
                .thenReturn(Collections.emptyList());

        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertFalse(result.isCanApprove());
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.OVERLAPPING_LEAVE.name())));
    }

    @Test
    void testEvaluate_HolidayConflict_AllDaysOnHoliday() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        // All 3 days fall on public holidays
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(3L);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.empty());

        LeaveBalance balance = new LeaveBalance(employee, leaveType, 10, 0);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));
        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(Collections.emptyList());
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), any()))
                .thenReturn(Collections.emptyList());

        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertFalse(result.isCanApprove());
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.HOLIDAY_CONFLICT.name())));
        assertEquals(0, result.getCalculatedEffectiveDays());
    }

    @Test
    void testEvaluate_PolicyViolation_MaxConsecutiveDaysExceeded() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(0L);

        // Policy allows only 2 consecutive days, requested is 3 days
        LeavePolicy policy = new LeavePolicy(leaveType, department, 10, 2, true);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.of(policy));

        LeaveBalance balance = new LeaveBalance(employee, leaveType, 10, 0);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));
        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(Collections.emptyList());
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), any()))
                .thenReturn(Collections.emptyList());

        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertFalse(result.isCanApprove());
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.POLICY_VIOLATION.name())));
        assertTrue(result.getConflicts().get(0).getMessage().contains("exceeds maximum consecutive days"));
    }

    @Test
    void testEvaluate_TeamAvailabilityBelowThreshold_ConflictDetected() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(0L);

        // Policy with 60% minimum availability required
        LeavePolicy policy = new LeavePolicy(leaveType, department, 10, 5, true, 60.0);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.of(policy));

        LeaveBalance balance = new LeaveBalance(employee, leaveType, 10, 0);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));
        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(Collections.emptyList());

        // 2 employees in department
        Employee emp2 = new Employee("EMP002", "Bob", "bob@co.com", "555-5678", "QA", LocalDate.of(2025, 1, 1), department);
        emp2.setId(11L);
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee, emp2));

        // On one of the dates, Bob is already on approved leave!
        Leave bobsLeave = new Leave(emp2, leaveType, LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 2), "Sick", LeaveStatus.APPROVED, LocalDateTime.now());
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), eq(LocalDate.of(2026, 11, 2))))
                .thenReturn(List.of(bobsLeave));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), eq(LocalDate.of(2026, 11, 3))))
                .thenReturn(Collections.emptyList());
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), eq(LocalDate.of(2026, 11, 4))))
                .thenReturn(Collections.emptyList());

        // On 2026-11-02: Total=2, Bob on leave=1. If Alice also approved, available=0 (0%). 0% < 60% threshold!
        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertFalse(result.isCanApprove());
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.TEAM_AVAILABILITY_CONFLICT.name())));
    }

    @Test
    void testEvaluate_MultipleConflicts_AllReturned() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(holidayService.countHolidaysBetween(any(), any())).thenReturn(0L);

        // Policy allows only 1 day (VIOLATION 1)
        LeavePolicy policy = new LeavePolicy(leaveType, department, 10, 1, true);
        when(leavePolicyService.findApplicablePolicy(5L, 1L)).thenReturn(Optional.of(policy));

        // Balance is 0 (VIOLATION 2)
        LeaveBalance balance = new LeaveBalance(employee, leaveType, 10, 10);
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));

        // Overlapping leave (VIOLATION 3)
        Leave overlap = new Leave(employee, leaveType, LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 2), "Overlap", LeaveStatus.PENDING, LocalDateTime.now());
        overlap.setId(105L);
        when(leaveRepository.findOverlappingLeaves(eq(10L), any(), any(), any(), eq(100L)))
                .thenReturn(List.of(overlap));

        when(employeeRepository.findByDepartmentId(1L)).thenReturn(List.of(employee));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(eq(1L), eq(LeaveStatus.APPROVED), any()))
                .thenReturn(Collections.emptyList());

        LeaveConflictResponseDTO result = leaveConflictService.evaluateLeave(100L, null);

        assertNotNull(result);
        assertFalse(result.isCanApprove());
        // All 3 conflicts are collected!
        assertEquals(3, result.getConflicts().size());
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.POLICY_VIOLATION.name())));
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.INSUFFICIENT_BALANCE.name())));
        assertTrue(result.getConflicts().stream().anyMatch(c -> c.getType().equals(ConflictType.OVERLAPPING_LEAVE.name())));
    }
}
