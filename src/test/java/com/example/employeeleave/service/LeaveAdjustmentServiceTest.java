package com.example.employeeleave.service;

import com.example.employeeleave.dto.LeaveAdjustmentRequestDTO;
import com.example.employeeleave.entity.Department;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveAdjustmentServiceTest {

    @Mock
    private LeaveAdjustmentRepository adjustmentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeaveBalanceService leaveBalanceService;

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;

    @Mock
    private AuditHistoryService auditHistoryService;

    @InjectMocks
    private LeaveAdjustmentService adjustmentService;

    private Employee employee;
    private LeaveType leaveType;
    private LeaveBalance balance;

    @BeforeEach
    void setUp() {
        Department department = new Department("Engineering");
        department.setId(1L);

        employee = new Employee("EMP001", "Alice Smith", "alice@example.com", "9876543210", "Developer", LocalDate.of(2026, 1, 1), department);
        employee.setId(1L);

        leaveType = new LeaveType("Casual Leave", "Casual leaves", 12);
        leaveType.setId(2L);

        balance = new LeaveBalance(employee, leaveType, 12, 2); // remaining = 10
        balance.setId(100L);
    }

    @Test
    void testCreateAdjustment_Positive_Success() {
        LeaveAdjustmentRequestDTO dto = new LeaveAdjustmentRequestDTO(1L, 2L, 5, "Discretionary reward", "HR-REQ-001");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(2L)).thenReturn(Optional.of(leaveType));
        when(leaveBalanceService.getOrCreateBalance(employee, leaveType)).thenReturn(balance);
        when(adjustmentRepository.save(any(LeaveAdjustment.class))).thenAnswer(invocation -> {
            LeaveAdjustment a = invocation.getArgument(0);
            a.setId(10L);
            return a;
        });

        LeaveAdjustment result = adjustmentService.createAdjustment(dto);

        assertNotNull(result);
        assertEquals(5, result.getAdjustmentDays());
        assertEquals(17, balance.getEntitlement()); // 12 + 5
        assertEquals(15, balance.getRemainingBalance()); // 17 - 2
        verify(leaveBalanceRepository, times(1)).save(balance);
        verify(auditHistoryService, times(1)).recordAudit(
                eq("SYSTEM"),
                eq("LEAVE_ADJUSTED"),
                eq("LEAVE_ADJUSTMENT"),
                eq(10L),
                eq("Remaining: 10, Entitlement: 12"),
                eq("Remaining: 15, Entitlement: 17"),
                anyString()
        );
    }

    @Test
    void testCreateAdjustment_Negative_Success() {
        LeaveAdjustmentRequestDTO dto = new LeaveAdjustmentRequestDTO(1L, 2L, -3, "Correction of over-allotment", "REF-002");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(2L)).thenReturn(Optional.of(leaveType));
        when(leaveBalanceService.getOrCreateBalance(employee, leaveType)).thenReturn(balance);
        when(adjustmentRepository.save(any(LeaveAdjustment.class))).thenAnswer(invocation -> {
            LeaveAdjustment a = invocation.getArgument(0);
            a.setId(11L);
            return a;
        });

        LeaveAdjustment result = adjustmentService.createAdjustment(dto);

        assertNotNull(result);
        assertEquals(-3, result.getAdjustmentDays());
        assertEquals(9, balance.getEntitlement()); // 12 - 3
        assertEquals(7, balance.getRemainingBalance()); // 9 - 2
        verify(leaveBalanceRepository, times(1)).save(balance);
    }

    @Test
    void testCreateAdjustment_Negative_ExceedingRemaining_ThrowsBadRequest() {
        LeaveAdjustmentRequestDTO dto = new LeaveAdjustmentRequestDTO(1L, 2L, -15, "Reduction", "REF-003");

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(2L)).thenReturn(Optional.of(leaveType));
        when(leaveBalanceService.getOrCreateBalance(employee, leaveType)).thenReturn(balance);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adjustmentService.createAdjustment(dto));
        assertTrue(ex.getMessage().contains("remaining balance cannot become negative"));
        verify(adjustmentRepository, never()).save(any());
        verify(auditHistoryService, never()).recordAudit(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void testCreateAdjustment_ZeroDays_ThrowsBadRequest() {
        LeaveAdjustmentRequestDTO dto = new LeaveAdjustmentRequestDTO(1L, 2L, 0, "No change", "REF-004");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adjustmentService.createAdjustment(dto));
        assertTrue(ex.getMessage().contains("cannot be zero"));
    }

    @Test
    void testCreateAdjustment_EmployeeNotFound_ThrowsNotFound() {
        LeaveAdjustmentRequestDTO dto = new LeaveAdjustmentRequestDTO(999L, 2L, 5, "Bonus", "REF-005");
        when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adjustmentService.createAdjustment(dto));
    }

    @Test
    void testCreateAdjustment_LeaveTypeNotFound_ThrowsNotFound() {
        LeaveAdjustmentRequestDTO dto = new LeaveAdjustmentRequestDTO(1L, 999L, 5, "Bonus", "REF-006");
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adjustmentService.createAdjustment(dto));
    }

    @Test
    void testGetAdjustmentsByEmployee() {
        LeaveAdjustment a1 = new LeaveAdjustment(employee, leaveType, 2, "Bonus", "REF-1");
        when(employeeRepository.existsById(1L)).thenReturn(true);
        when(adjustmentRepository.findByEmployeeIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(a1));

        List<LeaveAdjustment> list = adjustmentService.getAdjustmentsByEmployee(1L);
        assertEquals(1, list.size());
    }
}
