package com.example.employeeleave.service;

import com.example.employeeleave.entity.AuditHistory;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.AuditHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditHistoryServiceTest {

    @Mock
    private AuditHistoryRepository auditHistoryRepository;

    @InjectMocks
    private AuditHistoryService auditHistoryService;

    @Test
    void testRecordAudit_DefaultActor() {
        when(auditHistoryRepository.save(any(AuditHistory.class))).thenAnswer(i -> {
            AuditHistory a = i.getArgument(0);
            a.setId(1L);
            return a;
        });

        AuditHistory result = auditHistoryService.recordAudit("LEAVE_APPROVED", "LEAVE", 100L, "PENDING", "APPROVED", "Approved leave");

        assertNotNull(result);
        assertEquals("SYSTEM", result.getActor());
        assertEquals("LEAVE_APPROVED", result.getAction());
        assertEquals("LEAVE", result.getEntityType());
        assertEquals(100L, result.getEntityId());
        assertEquals("PENDING", result.getOldValue());
        assertEquals("APPROVED", result.getNewValue());
        verify(auditHistoryRepository, times(1)).save(any(AuditHistory.class));
    }

    @Test
    void testRecordAudit_CustomActor() {
        when(auditHistoryRepository.save(any(AuditHistory.class))).thenAnswer(i -> {
            AuditHistory a = i.getArgument(0);
            a.setId(2L);
            return a;
        });

        AuditHistory result = auditHistoryService.recordAudit("HR_ADMIN", "POLICY_CREATED", "LEAVE_POLICY", 5L, null, "Active", "Created policy");

        assertNotNull(result);
        assertEquals("HR_ADMIN", result.getActor());
        assertEquals("POLICY_CREATED", result.getAction());
    }

    @Test
    void testGetAuditById_Success() {
        AuditHistory audit = new AuditHistory("SYSTEM", "LEAVE_SUBMITTED", "LEAVE", 1L, null, "PENDING", "Submitted");
        audit.setId(10L);
        when(auditHistoryRepository.findById(10L)).thenReturn(Optional.of(audit));

        AuditHistory found = auditHistoryService.getAuditById(10L);
        assertNotNull(found);
        assertEquals(10L, found.getId());
    }

    @Test
    void testGetAuditById_NotFound() {
        when(auditHistoryRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> auditHistoryService.getAuditById(999L));
    }

    @Test
    void testGetFilteredAudits() {
        LocalDateTime now = LocalDateTime.now();
        AuditHistory audit = new AuditHistory("SYSTEM", "LEAVE_SUBMITTED", "LEAVE", 1L, null, "PENDING", "Submitted");
        when(auditHistoryRepository.findFilteredAuditHistory("LEAVE", 1L, "LEAVE_SUBMITTED", now.minusDays(1), now.plusDays(1)))
                .thenReturn(List.of(audit));

        List<AuditHistory> list = auditHistoryService.getFilteredAudits("LEAVE", 1L, "LEAVE_SUBMITTED", now.minusDays(1), now.plusDays(1));
        assertEquals(1, list.size());
    }
}
