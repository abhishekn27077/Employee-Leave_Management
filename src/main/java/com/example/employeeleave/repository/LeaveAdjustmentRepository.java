package com.example.employeeleave.repository;

import com.example.employeeleave.entity.LeaveAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveAdjustmentRepository extends JpaRepository<LeaveAdjustment, Long> {

    List<LeaveAdjustment> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<LeaveAdjustment> findByEmployeeDepartmentIdOrderByCreatedAtDesc(Long departmentId);

    List<LeaveAdjustment> findAllByOrderByCreatedAtDesc();
}
