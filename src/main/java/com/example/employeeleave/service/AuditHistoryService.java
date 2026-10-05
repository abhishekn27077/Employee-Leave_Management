package com.example.employeeleave.service;

import com.example.employeeleave.entity.AuditHistory;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.AuditHistoryRepository;
import com.example.employeeleave.security.SecurityContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class AuditHistoryService {

    private final AuditHistoryRepository auditHistoryRepository;

    public AuditHistoryService(AuditHistoryRepository auditHistoryRepository) {
        this.auditHistoryRepository = auditHistoryRepository;
    }

    public String resolveCurrentActor() {
        UserAccount currentUser = SecurityContext.getCurrentUser();
        if (currentUser != null && currentUser.getUsername() != null && !currentUser.getUsername().trim().isEmpty()) {
            return currentUser.getUsername().trim();
        }
        return "SYSTEM";
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public AuditHistory recordAudit(String actor,
                                    String action,
                                    String entityType,
                                    Long entityId,
                                    String oldValue,
                                    String newValue,
                                    String description) {
        String safeActor;
        if (actor != null && !actor.trim().isEmpty() && !"SYSTEM".equalsIgnoreCase(actor.trim())) {
            safeActor = actor.trim();
        } else {
            safeActor = resolveCurrentActor();
        }
        AuditHistory audit = new AuditHistory(
                safeActor,
                action,
                entityType,
                entityId,
                oldValue,
                newValue,
                description,
                LocalDateTime.now()
        );
        return auditHistoryRepository.save(audit);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public AuditHistory recordAudit(String action,
                                    String entityType,
                                    Long entityId,
                                    String oldValue,
                                    String newValue,
                                    String description) {
        return recordAudit(resolveCurrentActor(), action, entityType, entityId, oldValue, newValue, description);
    }

    @Transactional(readOnly = true)
    public List<AuditHistory> getAuditHistory(String entityType,
                                            Long entityId,
                                            String action,
                                            LocalDate startDate,
                                            LocalDate endDate) {
        LocalDateTime startTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endTime = endDate != null ? endDate.atTime(LocalTime.MAX) : null;
        return getFilteredAudits(entityType, entityId, action, startTime, endTime);
    }

    @Transactional(readOnly = true)
    public List<AuditHistory> getFilteredAudits(String entityType,
                                              Long entityId,
                                              String action,
                                              LocalDateTime startTime,
                                              LocalDateTime endTime) {
        String safeEntityType = (entityType != null && !entityType.trim().isEmpty()) ? entityType.trim() : null;
        String safeAction = (action != null && !action.trim().isEmpty()) ? action.trim() : null;
        return auditHistoryRepository.findFilteredAuditHistory(safeEntityType, entityId, safeAction, startTime, endTime);
    }

    @Transactional(readOnly = true)
    public AuditHistory getAuditById(Long id) {
        return auditHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Audit record not found with id: " + id));
    }
}
