package com.example.employeeleave.repository;

import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, Long> {

    List<Leave> findByEmployeeId(Long employeeId);

    List<Leave> findByEmployeeIdOrderByIdDesc(Long employeeId);

    List<Leave> findByEmployeeDepartmentIdOrderByIdDesc(Long departmentId);

    @Query("SELECT l FROM Leave l WHERE l.employee.department.id = :departmentId " +
           "AND l.status = :status " +
           "AND l.startDate <= :date AND l.endDate >= :date")
    List<Leave> findActiveLeavesByDepartmentAndStatusOnDate(
            @Param("departmentId") Long departmentId,
            @Param("status") LeaveStatus status,
            @Param("date") LocalDate date);

    @Query("SELECT l FROM Leave l WHERE l.employee.id = :employeeId " +
           "AND l.status IN (:statuses) " +
           "AND (:excludeLeaveId IS NULL OR l.id <> :excludeLeaveId) " +
           "AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<Leave> findOverlappingLeaves(
            @Param("employeeId") Long employeeId,
            @Param("statuses") List<LeaveStatus> statuses,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeLeaveId") Long excludeLeaveId);

    List<Leave> findByStatus(LeaveStatus status);

    List<Leave> findByStatusAndEndDateGreaterThanEqualOrderByStartDateAsc(LeaveStatus status, LocalDate date);

    List<Leave> findAllByOrderByIdDesc();
}
