package com.example.employeeleave.repository;

import com.example.employeeleave.entity.AuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditHistoryRepository extends JpaRepository<AuditHistory, Long> {

    @Query("SELECT a FROM AuditHistory a WHERE " +
           "(:entityType IS NULL OR a.entityType = :entityType) AND " +
           "(:entityId IS NULL OR a.entityId = :entityId) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:startTime IS NULL OR a.timestamp >= :startTime) AND " +
           "(:endTime IS NULL OR a.timestamp <= :endTime) " +
           "ORDER BY a.timestamp DESC")
    List<AuditHistory> findFilteredAuditHistory(
            @Param("entityType") String entityType,
            @Param("entityId") Long entityId,
            @Param("action") String action,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    List<AuditHistory> findAllByOrderByTimestampDesc();
}
