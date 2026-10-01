package com.example.employeeleave.service;

import com.example.employeeleave.dto.LeavePolicyRequestDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.LeavePolicy;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import com.example.employeeleave.repository.LeavePolicyRepository;
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
class LeavePolicyServiceTest {

    @Mock
    private LeavePolicyRepository leavePolicyRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private AuditHistoryService auditHistoryService;

    @InjectMocks
    private LeavePolicyService leavePolicyService;

    private LeaveType leaveType;
    private Department department;
    private LeavePolicy leavePolicy;

    @BeforeEach
    void setUp() {
        leaveType = new LeaveType("Earned Leave", "Annual earned leave", 20);
        leaveType.setId(1L);

        department = new Department("Engineering");
        department.setId(2L);

        leavePolicy = new LeavePolicy(leaveType, department, 24, 10, true);
        leavePolicy.setId(10L);
    }

    @Test
    void testCreateLeavePolicy_Success() {
        LeavePolicyRequestDTO request = new LeavePolicyRequestDTO(1L, 2L, 24, 10, true);
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(leaveType));
        when(departmentRepository.findById(2L)).thenReturn(Optional.of(department));
        when(leavePolicyRepository.existsByLeaveTypeIdAndDepartmentId(1L, 2L)).thenReturn(false);
        when(leavePolicyRepository.save(any(LeavePolicy.class))).thenReturn(leavePolicy);

        LeavePolicy created = leavePolicyService.createLeavePolicy(request);

        assertNotNull(created);
        assertEquals(24, created.getEntitlement());
        verify(leavePolicyRepository, times(1)).save(any(LeavePolicy.class));
    }

    @Test
    void testCreateLeavePolicy_GlobalSuccess() {
        LeavePolicy globalPolicy = new LeavePolicy(leaveType, null, 15, 5, true);
        LeavePolicyRequestDTO request = new LeavePolicyRequestDTO(1L, null, 15, 5, true);
        when(leaveTypeRepository.findById(1L)).thenReturn(Optional.of(leaveType));
        when(leavePolicyRepository.existsByLeaveTypeIdAndDepartmentIsNull(1L)).thenReturn(false);
        when(leavePolicyRepository.save(any(LeavePolicy.class))).thenReturn(globalPolicy);

        LeavePolicy created = leavePolicyService.createLeavePolicy(request);

        assertNotNull(created);
        assertNull(created.getDepartment());
        assertEquals(15, created.getEntitlement());
    }

    @Test
    void testCreateLeavePolicy_LeaveTypeNotFound_ThrowsResourceNotFoundException() {
        LeavePolicyRequestDTO request = new LeavePolicyRequestDTO(999L, null, 15, null, true);
        when(leaveTypeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leavePolicyService.createLeavePolicy(request));
    }

    @Test
    void testGetAllLeavePolicies() {
        when(leavePolicyRepository.findAll()).thenReturn(Arrays.asList(leavePolicy));

        List<LeavePolicy> policies = leavePolicyService.getAllLeavePolicies();

        assertEquals(1, policies.size());
        verify(leavePolicyRepository, times(1)).findAll();
    }

    @Test
    void testFindApplicablePolicy_DepartmentPolicyFound() {
        when(leavePolicyRepository.findByLeaveTypeIdAndDepartmentId(1L, 2L)).thenReturn(Optional.of(leavePolicy));

        Optional<LeavePolicy> policy = leavePolicyService.findApplicablePolicy(1L, 2L);

        assertTrue(policy.isPresent());
        assertEquals(24, policy.get().getEntitlement());
    }

    @Test
    void testFindApplicablePolicy_FallbackToGlobal() {
        when(leavePolicyRepository.findByLeaveTypeIdAndDepartmentId(1L, 2L)).thenReturn(Optional.empty());
        LeavePolicy globalPolicy = new LeavePolicy(leaveType, null, 18, 5, true);
        when(leavePolicyRepository.findByLeaveTypeIdAndDepartmentIsNull(1L)).thenReturn(Optional.of(globalPolicy));

        Optional<LeavePolicy> policy = leavePolicyService.findApplicablePolicy(1L, 2L);

        assertTrue(policy.isPresent());
        assertEquals(18, policy.get().getEntitlement());
    }

    @Test
    void testCreateLeavePolicy_InvalidMinAvailability_ThrowsBadRequestException() {
        LeavePolicyRequestDTO request = new LeavePolicyRequestDTO(1L, 2L, 24, 10, true, 150.0);
        assertThrows(BadRequestException.class, () -> leavePolicyService.createLeavePolicy(request));
    }
}
