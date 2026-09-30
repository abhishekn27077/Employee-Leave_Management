package com.example.employeeleave.service;

import com.example.employeeleave.dto.EmployeeRequestDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import com.example.employeeleave.repository.EmployeeRepository;
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
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private EmployeeService employeeService;

    private Department department;
    private Employee employee;
    private EmployeeRequestDTO requestDTO;

    @BeforeEach
    void setUp() {
        department = new Department("Information Technology");
        department.setId(1L);

        employee = new Employee(
                "EMP001",
                "Rahul Kumar",
                "rahul@example.com",
                "9876543210",
                "Software Developer",
                LocalDate.of(2026, 9, 29),
                department
        );
        employee.setId(10L);

        requestDTO = new EmployeeRequestDTO(
                "EMP001",
                "Rahul Kumar",
                "rahul@example.com",
                "9876543210",
                "Software Developer",
                LocalDate.of(2026, 9, 29),
                1L
        );
    }

    @Test
    void testCreateEmployee_Success() {
        when(employeeRepository.existsByEmployeeId("EMP001")).thenReturn(false);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(employeeRepository.save(any(Employee.class))).thenReturn(employee);

        Employee created = employeeService.createEmployee(requestDTO);

        assertNotNull(created);
        assertEquals("EMP001", created.getEmployeeId());
        assertEquals("Rahul Kumar", created.getName());
        assertEquals("rahul@example.com", created.getEmail());
        assertEquals("Information Technology", created.getDepartment().getName());
        verify(employeeRepository, times(1)).save(any(Employee.class));
    }

    @Test
    void testCreateEmployee_DepartmentNotFound_ThrowsResourceNotFoundException() {
        when(employeeRepository.existsByEmployeeId("EMP001")).thenReturn(false);
        when(departmentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> employeeService.createEmployee(requestDTO));
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    void testCreateEmployee_DuplicateEmployeeId_ThrowsBadRequestException() {
        when(employeeRepository.existsByEmployeeId("EMP001")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> employeeService.createEmployee(requestDTO));
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    void testCreateEmployee_InvalidEmail_ThrowsBadRequestException() {
        requestDTO.setEmail("invalid-email-string");

        assertThrows(BadRequestException.class, () -> employeeService.createEmployee(requestDTO));
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    void testCreateEmployee_BlankName_ThrowsBadRequestException() {
        requestDTO.setName("   ");

        assertThrows(BadRequestException.class, () -> employeeService.createEmployee(requestDTO));
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    void testCreateEmployee_NullDepartmentId_ThrowsBadRequestException() {
        requestDTO.setDepartmentId(null);

        assertThrows(BadRequestException.class, () -> employeeService.createEmployee(requestDTO));
        verify(employeeRepository, never()).save(any(Employee.class));
    }

    @Test
    void testGetAllEmployees() {
        when(employeeRepository.findAll()).thenReturn(Arrays.asList(employee));

        List<Employee> list = employeeService.getAllEmployees();

        assertEquals(1, list.size());
        verify(employeeRepository, times(1)).findAll();
    }

    @Test
    void testGetEmployeeById_Found() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));

        Employee found = employeeService.getEmployeeById(10L);

        assertNotNull(found);
        assertEquals(10L, found.getId());
        assertEquals("Rahul Kumar", found.getName());
    }

    @Test
    void testGetEmployeeById_NotFound_ThrowsResourceNotFoundException() {
        when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> employeeService.getEmployeeById(999L));
    }

    @Test
    void testUpdateEmployee_Success() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(employeeRepository.save(any(Employee.class))).thenReturn(employee);

        requestDTO.setName("Rahul K. Sharma");
        Employee updated = employeeService.updateEmployee(10L, requestDTO);

        assertNotNull(updated);
        verify(employeeRepository, times(1)).save(employee);
    }

    @Test
    void testDeleteEmployee_Success() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        doNothing().when(employeeRepository).delete(employee);

        assertDoesNotThrow(() -> employeeService.deleteEmployee(10L));
        verify(employeeRepository, times(1)).delete(employee);
    }
}
