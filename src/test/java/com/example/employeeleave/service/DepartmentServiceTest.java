package com.example.employeeleave.service;

import com.example.employeeleave.entity.Department;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private DepartmentService departmentService;

    private Department department;

    @BeforeEach
    void setUp() {
        department = new Department("Information Technology");
        department.setId(1L);
    }

    @Test
    void testCreateDepartment_Success() {
        when(departmentRepository.save(any(Department.class))).thenReturn(department);

        Department toCreate = new Department("Information Technology");
        Department created = departmentService.createDepartment(toCreate);

        assertNotNull(created);
        assertEquals("Information Technology", created.getName());
        verify(departmentRepository, times(1)).save(any(Department.class));
    }

    @Test
    void testCreateDepartment_EmptyName_ThrowsBadRequestException() {
        Department toCreate = new Department("   ");

        assertThrows(BadRequestException.class, () -> departmentService.createDepartment(toCreate));
        verify(departmentRepository, never()).save(any(Department.class));
    }

    @Test
    void testGetAllDepartments() {
        Department dep2 = new Department("Human Resources");
        dep2.setId(2L);
        when(departmentRepository.findAll()).thenReturn(Arrays.asList(department, dep2));

        List<Department> list = departmentService.getAllDepartments();

        assertEquals(2, list.size());
        verify(departmentRepository, times(1)).findAll();
    }

    @Test
    void testGetDepartmentById_Found() {
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));

        Department found = departmentService.getDepartmentById(1L);

        assertNotNull(found);
        assertEquals(1L, found.getId());
        assertEquals("Information Technology", found.getName());
    }

    @Test
    void testGetDepartmentById_NotFound_ThrowsResourceNotFoundException() {
        when(departmentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> departmentService.getDepartmentById(99L));
    }

    @Test
    void testUpdateDepartment_Success() {
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(departmentRepository.save(any(Department.class))).thenReturn(department);

        Department updateDetails = new Department("IT & Infrastructure");
        Department updated = departmentService.updateDepartment(1L, updateDetails);

        assertNotNull(updated);
        assertEquals("IT & Infrastructure", department.getName());
        verify(departmentRepository, times(1)).save(department);
    }

    @Test
    void testDeleteDepartment_Success() {
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        doNothing().when(departmentRepository).delete(department);

        assertDoesNotThrow(() -> departmentService.deleteDepartment(1L));
        verify(departmentRepository, times(1)).delete(department);
    }
}
