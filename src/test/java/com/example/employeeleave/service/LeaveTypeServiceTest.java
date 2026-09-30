package com.example.employeeleave.service;

import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.LeaveTypeRepository;
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
class LeaveTypeServiceTest {

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @InjectMocks
    private LeaveTypeService leaveTypeService;

    private LeaveType leaveType;

    @BeforeEach
    void setUp() {
        leaveType = new LeaveType("Casual Leave", "Annual casual leave allowance", 12);
        leaveType.setId(1L);
    }

    @Test
    void testCreateLeaveType_Success() {
        when(leaveTypeRepository.existsByNameIgnoreCase("Casual Leave")).thenReturn(false);
        when(leaveTypeRepository.save(any(LeaveType.class))).thenReturn(leaveType);

        LeaveType toCreate = new LeaveType("Casual Leave", "Annual casual leave allowance", 12);
        LeaveType created = leaveTypeService.createLeaveType(toCreate);

        assertNotNull(created);
        assertEquals("Casual Leave", created.getName());
        assertEquals(12, created.getDefaultDays());
        verify(leaveTypeRepository, times(1)).save(any(LeaveType.class));
    }

    @Test
    void testCreateLeaveType_DuplicateName_ThrowsBadRequestException() {
        when(leaveTypeRepository.existsByNameIgnoreCase("Casual Leave")).thenReturn(true);

        LeaveType toCreate = new LeaveType("Casual Leave", "Annual casual leave allowance", 12);

        assertThrows(BadRequestException.class, () -> leaveTypeService.createLeaveType(toCreate));
        verify(leaveTypeRepository, never()).save(any(LeaveType.class));
    }

    @Test
    void testCreateLeaveType_BlankName_ThrowsBadRequestException() {
        LeaveType toCreate = new LeaveType("  ", "Description", 10);

        assertThrows(BadRequestException.class, () -> leaveTypeService.createLeaveType(toCreate));
        verify(leaveTypeRepository, never()).save(any(LeaveType.class));
    }

    @Test
    void testCreateLeaveType_NullDefaultDays_ThrowsBadRequestException() {
        LeaveType toCreate = new LeaveType("Sick Leave", "Medical leave", null);

        assertThrows(BadRequestException.class, () -> leaveTypeService.createLeaveType(toCreate));
        verify(leaveTypeRepository, never()).save(any(LeaveType.class));
    }

    @Test
    void testCreateLeaveType_ZeroOrNegativeDefaultDays_ThrowsBadRequestException() {
        LeaveType zeroDays = new LeaveType("Sick Leave", "Medical leave", 0);
        assertThrows(BadRequestException.class, () -> leaveTypeService.createLeaveType(zeroDays));

        LeaveType negativeDays = new LeaveType("Sick Leave", "Medical leave", -5);
        assertThrows(BadRequestException.class, () -> leaveTypeService.createLeaveType(negativeDays));

        verify(leaveTypeRepository, never()).save(any(LeaveType.class));
    }

    @Test
    void testGetAllLeaveTypes() {
        LeaveType sickLeave = new LeaveType("Sick Leave", "Medical leave", 10);
        sickLeave.setId(2L);
        when(leaveTypeRepository.findAll()).thenReturn(Arrays.asList(leaveType, sickLeave));

        List<LeaveType> list = leaveTypeService.getAllLeaveTypes();

        assertEquals(2, list.size());
        verify(leaveTypeRepository, times(1)).findAll();
    }

    @Test
    void testGetLeaveTypeById_Found() {
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(leaveType));

        LeaveType found = leaveTypeService.getLeaveTypeById(1L);

        assertNotNull(found);
        assertEquals(1L, found.getId());
        assertEquals("Casual Leave", found.getName());
    }

    @Test
    void testGetLeaveTypeById_NotFound_ThrowsResourceNotFoundException() {
        when(leaveTypeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveTypeService.getLeaveTypeById(99L));
    }

    @Test
    void testUpdateLeaveType_Success() {
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(leaveType));
        when(leaveTypeRepository.save(any(LeaveType.class))).thenReturn(leaveType);

        LeaveType updateDetails = new LeaveType("Privilege Leave", "Paid vacation", 15);
        LeaveType updated = leaveTypeService.updateLeaveType(1L, updateDetails);

        assertNotNull(updated);
        assertEquals("Privilege Leave", leaveType.getName());
        assertEquals(15, leaveType.getDefaultDays());
        verify(leaveTypeRepository, times(1)).save(leaveType);
    }

    @Test
    void testDeleteLeaveType_Success() {
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(leaveType));
        doNothing().when(leaveTypeRepository).delete(leaveType);

        assertDoesNotThrow(() -> leaveTypeService.deleteLeaveType(1L));
        verify(leaveTypeRepository, times(1)).delete(leaveType);
    }
}
