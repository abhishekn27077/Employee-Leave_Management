package com.example.employeeleave.service;

import com.example.employeeleave.dto.ConflictDetailDTO;
import com.example.employeeleave.dto.ConflictType;
import com.example.employeeleave.dto.LeaveConflictResponseDTO;
import com.example.employeeleave.dto.LeaveRequestDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.LeaveConflictException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.security.SecurityContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {

    @Mock
    private LeaveRepository leaveRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeaveBalanceService leaveBalanceService;

    @Mock
    private HolidayService holidayService;

    @Mock
    private LeaveConflictService leaveConflictService;

    @Mock
    private AuditHistoryService auditHistoryService;

    @InjectMocks
    private LeaveService leaveService;

    private Employee employee;
    private LeaveType leaveType;
    private Leave leave;
    private LeaveRequestDTO requestDTO;

    @BeforeEach
    void setUp() {
        Department department = new Department("Information Technology");
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

        leaveType = new LeaveType("Casual Leave", "Annual casual leave", 12);
        leaveType.setId(5L);

        leave = new Leave(
                employee,
                leaveType,
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3),
                "Personal work",
                LeaveStatus.PENDING,
                LocalDateTime.now()
        );
        leave.setId(100L);

        requestDTO = new LeaveRequestDTO(
                10L,
                5L,
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3),
                "Personal work"
        );
    }

    @Test
    void testApplyLeave_Success() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.of(leaveType));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(true);
        when(leaveConflictService.evaluateRequest(any(LeaveRequestDTO.class), any())).thenReturn(evaluation);
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        Leave applied = leaveService.applyLeave(requestDTO);

        assertNotNull(applied);
        assertEquals(LeaveStatus.PENDING, applied.getStatus());
        assertNotNull(applied.getAppliedAt());
        assertEquals("Personal work", applied.getReason());
        verify(leaveRepository, times(1)).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_ConflictDetected_ThrowsLeaveConflictException() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.of(leaveType));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(false);
        evaluation.setConflicts(List.of(new ConflictDetailDTO(ConflictType.OVERLAPPING_LEAVE, "Overlapping leave found", true)));
        when(leaveConflictService.evaluateRequest(any(LeaveRequestDTO.class), any())).thenReturn(evaluation);

        LeaveConflictException ex = assertThrows(LeaveConflictException.class, () -> leaveService.applyLeave(requestDTO));
        assertTrue(ex.getMessage().contains("Overlapping leave found"));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_EmployeeNotFound_ThrowsResourceNotFoundException() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_LeaveTypeNotFound_ThrowsResourceNotFoundException() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_EndDateBeforeStartDate_ThrowsBadRequestException() {
        requestDTO.setEndDate(LocalDate.of(2026, 9, 30));

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_BlankReason_ThrowsBadRequestException() {
        requestDTO.setReason("   ");

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_NullStartDate_ThrowsBadRequestException() {
        requestDTO.setStartDate(null);

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_NullEndDate_ThrowsBadRequestException() {
        requestDTO.setEndDate(null);

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_NullEmployeeId_ThrowsBadRequestException() {
        requestDTO.setEmployeeId(null);

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApplyLeave_NullLeaveTypeId_ThrowsBadRequestException() {
        requestDTO.setLeaveTypeId(null);

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testGetAllLeaves() {
        when(leaveRepository.findAll()).thenReturn(Arrays.asList(leave));

        List<Leave> leaves = leaveService.getAllLeaves();

        assertEquals(1, leaves.size());
        verify(leaveRepository, times(1)).findAll();
    }

    @Test
    void testGetLeaveById_Found() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));

        Leave found = leaveService.getLeaveById(100L);

        assertNotNull(found);
        assertEquals(100L, found.getId());
        assertEquals(LeaveStatus.PENDING, found.getStatus());
    }

    @Test
    void testGetLeaveById_NotFound_ThrowsResourceNotFoundException() {
        when(leaveRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveService.getLeaveById(999L));
    }

    @Test
    void testApproveLeave_Success() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(true);
        when(leaveConflictService.evaluateLeave(eq(leave), any())).thenReturn(evaluation);
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        Leave approved = leaveService.approveLeave(100L);

        assertNotNull(approved);
        assertEquals(LeaveStatus.APPROVED, leave.getStatus());
        verify(leaveConflictService, times(1)).evaluateLeave(eq(leave), any());
        verify(leaveBalanceService, times(1)).deductApprovedDays(any(), any(), anyInt());
        verify(leaveRepository, times(1)).save(leave);
    }

    @Test
    void testApproveLeave_ConflictDetected_ThrowsLeaveConflictException() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(false);
        evaluation.setConflicts(List.of(new ConflictDetailDTO(ConflictType.INSUFFICIENT_BALANCE, "Insufficient leave balance", true)));
        when(leaveConflictService.evaluateLeave(eq(leave), any())).thenReturn(evaluation);

        LeaveConflictException ex = assertThrows(LeaveConflictException.class, () -> leaveService.approveLeave(100L));

        assertTrue(ex.getMessage().contains("Insufficient leave balance"));
        assertEquals(1, ex.getConflicts().size());
        assertEquals(LeaveStatus.PENDING, leave.getStatus());
        verify(leaveBalanceService, never()).deductApprovedDays(any(), any(), anyInt());
        verify(leaveRepository, never()).save(any(Leave.class));
        verify(auditHistoryService, times(1)).recordAudit(
                anyString(),
                eq("LEAVE_APPROVAL_BLOCKED"),
                eq("LEAVE"),
                eq(100L),
                eq("PENDING"),
                eq("PENDING"),
                contains("Insufficient leave balance")
        );
    }

    @Test
    void testApproveLeave_NotPending_ThrowsBadRequestException() {
        leave.setStatus(LeaveStatus.APPROVED);
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));

        assertThrows(BadRequestException.class, () -> leaveService.approveLeave(100L));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApproveLeave_NotFound_ThrowsResourceNotFoundException() {
        when(leaveRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveService.approveLeave(999L));
    }

    @Test
    void testRejectLeave_Success() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        Leave rejected = leaveService.rejectLeave(100L);

        assertNotNull(rejected);
        assertEquals(LeaveStatus.REJECTED, leave.getStatus());
        verify(leaveRepository, times(1)).save(leave);
    }

    @Test
    void testRejectLeave_NotPending_ThrowsBadRequestException() {
        leave.setStatus(LeaveStatus.REJECTED);
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));

        assertThrows(BadRequestException.class, () -> leaveService.rejectLeave(100L));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testRejectLeave_NotFound_ThrowsResourceNotFoundException() {
        when(leaveRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveService.rejectLeave(999L));
    }

    @Test
    void testCancelLeave_Success() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        Leave cancelled = leaveService.cancelLeave(100L);

        assertNotNull(cancelled);
        assertEquals(LeaveStatus.CANCELLED, leave.getStatus());
        verify(leaveRepository, times(1)).save(leave);
    }

    @Test
    void testCancelLeave_NotPending_ThrowsBadRequestException() {
        leave.setStatus(LeaveStatus.CANCELLED);
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));

        assertThrows(BadRequestException.class, () -> leaveService.cancelLeave(100L));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testCancelLeave_NotFound_ThrowsResourceNotFoundException() {
        when(leaveRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> leaveService.cancelLeave(999L));
    }

    @Test
    void testApplyLeave_InsufficientBalance_ThrowsBadRequestException() {
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.of(leaveType));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(true);
        when(leaveConflictService.evaluateRequest(any(LeaveRequestDTO.class), any())).thenReturn(evaluation);
        doThrow(new BadRequestException("Insufficient leave balance"))
                .when(leaveBalanceService).checkBalance(any(Employee.class), any(LeaveType.class), anyInt());

        assertThrows(BadRequestException.class, () -> leaveService.applyLeave(requestDTO));
        verify(leaveRepository, never()).save(any(Leave.class));
    }

    @Test
    void testApproveLeave_DeductsBalance() {
        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(true);
        when(leaveConflictService.evaluateLeave(eq(leave), any())).thenReturn(evaluation);
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        Leave approved = leaveService.approveLeave(100L);

        assertNotNull(approved);
        assertEquals(LeaveStatus.APPROVED, approved.getStatus());
        verify(leaveBalanceService, times(1)).deductApprovedDays(eq(employee), eq(leaveType), eq(3));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Test
    void testApproveLeave_RecordsAuthenticatedManagerAsActor() {
        UserAccount managerUser = new UserAccount("manager_dave", "dave@example.com", "hash", UserRole.MANAGER, true, null);
        SecurityContext.setCurrentUser(managerUser);

        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(true);
        when(leaveConflictService.evaluateLeave(eq(leave), any())).thenReturn(evaluation);
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        leaveService.approveLeave(100L);

        verify(auditHistoryService, times(1)).recordAudit(
                eq("manager_dave"),
                eq("LEAVE_APPROVED"),
                eq("LEAVE"),
                eq(100L),
                eq("PENDING"),
                eq("APPROVED"),
                anyString()
        );
    }

    @Test
    void testRejectLeave_RecordsAuthenticatedManagerAsActor() {
        UserAccount managerUser = new UserAccount("manager_dave", "dave@example.com", "hash", UserRole.MANAGER, true, null);
        SecurityContext.setCurrentUser(managerUser);

        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        leaveService.rejectLeave(100L);

        verify(auditHistoryService, times(1)).recordAudit(
                eq("manager_dave"),
                eq("LEAVE_REJECTED"),
                eq("LEAVE"),
                eq(100L),
                eq("PENDING"),
                eq("REJECTED"),
                anyString()
        );
    }

    @Test
    void testCancelLeave_RecordsAuthenticatedEmployeeAsActor() {
        UserAccount employeeUser = new UserAccount("rahul_emp", "rahul@example.com", "hash", UserRole.EMPLOYEE, true, employee);
        SecurityContext.setCurrentUser(employeeUser);

        when(leaveRepository.findById(100L)).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any(Leave.class))).thenReturn(leave);

        leaveService.cancelLeave(100L);

        verify(auditHistoryService, times(1)).recordAudit(
                eq("rahul_emp"),
                eq("LEAVE_CANCELLED"),
                eq("LEAVE"),
                eq(100L),
                eq("PENDING"),
                eq("CANCELLED"),
                anyString()
        );
    }

    @Test
    void testApplyLeave_RecordsAuthenticatedEmployeeAsActor() {
        UserAccount employeeUser = new UserAccount("rahul_emp", "rahul@example.com", "hash", UserRole.EMPLOYEE, true, employee);
        SecurityContext.setCurrentUser(employeeUser);

        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(leaveTypeRepository.findById(5L)).thenReturn(Optional.of(leaveType));
        LeaveConflictResponseDTO evaluation = new LeaveConflictResponseDTO();
        evaluation.setCanApprove(true);
        when(leaveConflictService.evaluateRequest(any(LeaveRequestDTO.class), any())).thenReturn(evaluation);
        when(leaveRepository.save(any(Leave.class))).thenAnswer(invocation -> {
            Leave l = invocation.getArgument(0);
            l.setId(101L);
            return l;
        });

        leaveService.applyLeave(requestDTO);

        verify(auditHistoryService, times(1)).recordAudit(
                eq("rahul_emp"),
                eq("LEAVE_SUBMITTED"),
                eq("LEAVE"),
                eq(101L),
                isNull(),
                eq("PENDING"),
                anyString()
        );
    }
}
