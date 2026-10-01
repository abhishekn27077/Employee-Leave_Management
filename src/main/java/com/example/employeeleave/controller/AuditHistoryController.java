package com.example.employeeleave.controller;

import com.example.employeeleave.entity.AuditHistory;
import com.example.employeeleave.service.AuditHistoryService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit-history")
@CrossOrigin(origins = "*")
public class AuditHistoryController {

    private final AuditHistoryService auditHistoryService;

    public AuditHistoryController(AuditHistoryService auditHistoryService) {
        this.auditHistoryService = auditHistoryService;
    }

    @GetMapping
    public ResponseEntity<List<AuditHistory>> getAuditHistory(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        List<AuditHistory> audits = auditHistoryService.getFilteredAudits(entityType, entityId, action, startDate, endDate);
        return ResponseEntity.ok(audits);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AuditHistory> getAuditById(@PathVariable Long id) {
        return ResponseEntity.ok(auditHistoryService.getAuditById(id));
    }
}
