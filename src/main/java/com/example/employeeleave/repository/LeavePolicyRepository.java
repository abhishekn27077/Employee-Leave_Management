package com.example.employeeleave.repository;

import com.example.employeeleave.entity.LeavePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeavePolicyRepository extends JpaRepository<LeavePolicy, Long> {

    List<LeavePolicy> findByLeaveTypeId(Long leaveTypeId);

    Optional<LeavePolicy> findByLeaveTypeIdAndDepartmentId(Long leaveTypeId, Long departmentId);

    Optional<LeavePolicy> findByLeaveTypeIdAndDepartmentIsNull(Long leaveTypeId);

    boolean existsByLeaveTypeIdAndDepartmentId(Long leaveTypeId, Long departmentId);

    boolean existsByLeaveTypeIdAndDepartmentIsNull(Long leaveTypeId);
}
