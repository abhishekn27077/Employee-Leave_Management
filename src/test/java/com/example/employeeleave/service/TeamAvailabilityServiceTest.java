package com.example.employeeleave.service;

import com.example.employeeleave.dto.TeamAvailabilityResponseDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamAvailabilityServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveRepository leaveRepository;

    @InjectMocks
    private TeamAvailabilityService teamAvailabilityService;

    private Department department;
    private Employee emp1;
    private Employee emp2;
    private LeaveType leaveType;

    @BeforeEach
    void setUp() {
        department = new Department("Software Engineering");
        department.setId(1L);

        emp1 = new Employee("EMP101", "Alice Smith", "alice@example.com", "1234567890", "Senior Dev", LocalDate.of(2026, 1, 1), department);
        emp1.setId(10L);

        emp2 = new Employee("EMP102", "Bob Jones", "bob@example.com", "0987654321", "QA Engineer", LocalDate.of(2026, 2, 1), department);
        emp2.setId(20L);

        leaveType = new LeaveType("Casual Leave", "Paid time off", 12);
        leaveType.setId(5L);
    }

    @Test
    void testDepartmentAvailability_AllAvailable() {
        LocalDate queryDate = LocalDate.of(2026, 10, 15);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(Arrays.asList(emp1, emp2));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(1L, LeaveStatus.APPROVED, queryDate))
                .thenReturn(new ArrayList<>());

        TeamAvailabilityResponseDTO result = teamAvailabilityService.getDepartmentAvailability(1L, queryDate);

        assertNotNull(result);
        assertEquals(2, result.getTotalEmployees());
        assertEquals(0, result.getOnLeaveCount());
        assertEquals(2, result.getAvailableCount());
        assertEquals(100.0, result.getAvailabilityPercentage());
        assertEquals(2, result.getAvailableEmployees().size());
        assertEquals(0, result.getOnLeaveEmployees().size());
    }

    @Test
    void testDepartmentAvailability_WithApprovedLeave() {
        LocalDate queryDate = LocalDate.of(2026, 10, 15);
        Leave approvedLeave = new Leave(emp1, leaveType, LocalDate.of(2026, 10, 14), LocalDate.of(2026, 10, 16), "Conference", LeaveStatus.APPROVED, LocalDateTime.now());

        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(Arrays.asList(emp1, emp2));
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(1L, LeaveStatus.APPROVED, queryDate))
                .thenReturn(List.of(approvedLeave));

        TeamAvailabilityResponseDTO result = teamAvailabilityService.getDepartmentAvailability(1L, queryDate);

        assertNotNull(result);
        assertEquals(2, result.getTotalEmployees());
        assertEquals(1, result.getOnLeaveCount());
        assertEquals(1, result.getAvailableCount());
        assertEquals(50.0, result.getAvailabilityPercentage());
        assertEquals(1, result.getOnLeaveEmployees().size());
        assertEquals("Alice Smith", result.getOnLeaveEmployees().get(0).getName());
        assertEquals("Bob Jones", result.getAvailableEmployees().get(0).getName());
    }

    @Test
    void testDepartmentAvailability_ZeroEmployeesDepartment() {
        LocalDate queryDate = LocalDate.of(2026, 10, 15);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(employeeRepository.findByDepartmentId(1L)).thenReturn(new ArrayList<>());
        when(leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(1L, LeaveStatus.APPROVED, queryDate))
                .thenReturn(new ArrayList<>());

        TeamAvailabilityResponseDTO result = teamAvailabilityService.getDepartmentAvailability(1L, queryDate);

        assertNotNull(result);
        assertEquals(0, result.getTotalEmployees());
        assertEquals(0, result.getOnLeaveCount());
        assertEquals(0, result.getAvailableCount());
        assertEquals(100.0, result.getAvailabilityPercentage());
    }

    @Test
    void testDepartmentAvailability_DepartmentNotFound_ThrowsResourceNotFoundException() {
        LocalDate queryDate = LocalDate.of(2026, 10, 15);
        when(departmentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> teamAvailabilityService.getDepartmentAvailability(999L, queryDate));
    }

    @Test
    void testDepartmentAvailability_NullDepartmentId_ThrowsBadRequestException() {
        assertThrows(BadRequestException.class, () -> teamAvailabilityService.getDepartmentAvailability(null, LocalDate.now()));
    }

    @Test
    void testDepartmentAvailability_NullDate_ThrowsBadRequestException() {
        assertThrows(BadRequestException.class, () -> teamAvailabilityService.getDepartmentAvailability(1L, null));
    }
}
