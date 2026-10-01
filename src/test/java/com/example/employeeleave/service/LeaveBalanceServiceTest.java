package com.example.employeeleave.service;

import com.example.employeeleave.dto.LeaveBalanceRequestDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.entity.LeavePolicy;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveBalanceRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveBalanceServiceTest {

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeavePolicyService leavePolicyService;

    @InjectMocks
    private LeaveBalanceService leaveBalanceService;

    private Employee employee;
    private LeaveType leaveType;
    private LeaveBalance balance;

    @BeforeEach
    void setUp() {
        Department department = new Department("Engineering");
        department.setId(1L);

        employee = new Employee("EMP001", "Rahul Kumar", "rahul@example.com", "9876543210", "Developer", LocalDate.now(), department);
        employee.setId(10L);

        leaveType = new LeaveType("Casual Leave", "Annual casual leave", 12);
        leaveType.setId(5L);

        balance = new LeaveBalance(employee, leaveType, 12, 0);
        balance.setId(100L);
    }

    @Test
    void testCreateOrInitBalance_Success() {
        LeaveBalanceRequestDTO request = new LeaveBalanceRequestDTO(10L, 5L, 14);
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.of(leaveType));
        when(leaveBalanceRepository.existsByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(false);
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenReturn(new LeaveBalance(employee, leaveType, 14, 0));

        LeaveBalance created = leaveBalanceService.createOrInitBalance(request);

        assertNotNull(created);
        assertEquals(14, created.getEntitlement());
        assertEquals(0, created.getUsedDays());
        assertEquals(14, created.getRemainingBalance());
    }

    @Test
    void testCreateOrInitBalance_AlreadyExists_ThrowsBadRequestException() {
        LeaveBalanceRequestDTO request = new LeaveBalanceRequestDTO(10L, 5L, 14);
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.of(leaveType));
        when(leaveBalanceRepository.existsByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> leaveBalanceService.createOrInitBalance(request));
    }

    @Test
    void testCheckBalance_SufficientBalance_ReturnsBalance() {
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));

        LeaveBalance checked = leaveBalanceService.checkBalance(employee, leaveType, 3);

        assertNotNull(checked);
        assertEquals(12, checked.getRemainingBalance());
    }

    @Test
    void testCheckBalance_InsufficientBalance_ThrowsBadRequestException() {
        balance.setUsedDays(11);
        balance.recalculateRemaining(); // remaining = 1
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));

        assertThrows(BadRequestException.class, () -> leaveBalanceService.checkBalance(employee, leaveType, 3));
    }

    @Test
    void testDeductApprovedDays_Success() {
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));
        when(leaveBalanceRepository.save(any(LeaveBalance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LeaveBalance updated = leaveBalanceService.deductApprovedDays(employee, leaveType, 4);

        assertEquals(4, updated.getUsedDays());
        assertEquals(8, updated.getRemainingBalance());
    }

    @Test
    void testDeductApprovedDays_InsufficientBalance_ThrowsBadRequestException() {
        balance.setUsedDays(10);
        balance.recalculateRemaining(); // remaining = 2
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(10L, 5L)).thenReturn(Optional.of(balance));

        assertThrows(BadRequestException.class, () -> leaveBalanceService.deductApprovedDays(employee, leaveType, 5));
    }
}
