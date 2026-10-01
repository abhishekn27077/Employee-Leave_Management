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
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class LeavePolicyService {

    private final LeavePolicyRepository leavePolicyRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final DepartmentRepository departmentRepository;
    private final AuditHistoryService auditHistoryService;

    public LeavePolicyService(LeavePolicyRepository leavePolicyRepository,
                              LeaveTypeRepository leaveTypeRepository,
                              DepartmentRepository departmentRepository,
                              AuditHistoryService auditHistoryService) {
        this.leavePolicyRepository = leavePolicyRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.departmentRepository = departmentRepository;
        this.auditHistoryService = auditHistoryService;
    }

    public LeavePolicy createLeavePolicy(LeavePolicyRequestDTO request) {
        validateRequest(request);

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));

            if (leavePolicyRepository.existsByLeaveTypeIdAndDepartmentId(leaveType.getId(), department.getId())) {
                throw new BadRequestException("A policy already exists for leave type '" + leaveType.getName() + "' and department '" + department.getName() + "'");
            }
        } else {
            if (leavePolicyRepository.existsByLeaveTypeIdAndDepartmentIsNull(leaveType.getId())) {
                throw new BadRequestException("A default global policy already exists for leave type '" + leaveType.getName() + "'");
            }
        }

        LeavePolicy policy = new LeavePolicy(
                leaveType,
                department,
                request.getEntitlement(),
                request.getMaxConsecutiveDays(),
                request.getRequiresApproval() != null ? request.getRequiresApproval() : true,
                request.getMinAvailabilityPercentage()
        );

        LeavePolicy savedPolicy = leavePolicyRepository.save(policy);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "POLICY_CREATED",
                "LEAVE_POLICY",
                savedPolicy.getId(),
                null,
                "Entitlement: " + savedPolicy.getEntitlement(),
                "Policy created for " + leaveType.getName() + (department != null ? " in " + department.getName() : " (Global)")
        );

        return savedPolicy;
    }

    public List<LeavePolicy> getAllLeavePolicies() {
        return leavePolicyRepository.findAll();
    }

    public LeavePolicy getLeavePolicyById(Long id) {
        return leavePolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave policy not found with id: " + id));
    }

    public LeavePolicy updateLeavePolicy(Long id, LeavePolicyRequestDTO request) {
        LeavePolicy policy = getLeavePolicyById(id);
        validateRequest(request);

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        Department department = null;
        if (request.getDepartmentId() != null) {
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));
        }

        policy.setLeaveType(leaveType);
        policy.setDepartment(department);
        policy.setEntitlement(request.getEntitlement());
        policy.setMaxConsecutiveDays(request.getMaxConsecutiveDays());
        policy.setRequiresApproval(request.getRequiresApproval() != null ? request.getRequiresApproval() : true);
        policy.setMinAvailabilityPercentage(request.getMinAvailabilityPercentage());

        LeavePolicy updatedPolicy = leavePolicyRepository.save(policy);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "POLICY_UPDATED",
                "LEAVE_POLICY",
                updatedPolicy.getId(),
                null,
                "Entitlement: " + updatedPolicy.getEntitlement(),
                "Policy updated for " + leaveType.getName() + (department != null ? " in " + department.getName() : " (Global)")
        );

        return updatedPolicy;
    }

    public void deleteLeavePolicy(Long id) {
        LeavePolicy policy = getLeavePolicyById(id);
        leavePolicyRepository.delete(policy);

        auditHistoryService.recordAudit(
                "SYSTEM",
                "POLICY_DELETED",
                "LEAVE_POLICY",
                policy.getId(),
                "Entitlement: " + policy.getEntitlement(),
                null,
                "Policy deleted for " + policy.getLeaveType().getName()
        );
    }

    public Optional<LeavePolicy> findApplicablePolicy(Long leaveTypeId, Long departmentId) {
        if (departmentId != null) {
            Optional<LeavePolicy> deptPolicy = leavePolicyRepository.findByLeaveTypeIdAndDepartmentId(leaveTypeId, departmentId);
            if (deptPolicy.isPresent()) {
                return deptPolicy;
            }
        }
        return leavePolicyRepository.findByLeaveTypeIdAndDepartmentIsNull(leaveTypeId);
    }

    private void validateRequest(LeavePolicyRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Leave policy request body cannot be null");
        }
        if (request.getLeaveTypeId() == null) {
            throw new BadRequestException("Leave type ID is required");
        }
        if (request.getEntitlement() == null || request.getEntitlement() <= 0) {
            throw new BadRequestException("Entitlement must be greater than 0");
        }
        if (request.getMaxConsecutiveDays() != null && request.getMaxConsecutiveDays() <= 0) {
            throw new BadRequestException("Max consecutive days must be a positive number");
        }
        if (request.getMinAvailabilityPercentage() != null && (request.getMinAvailabilityPercentage() < 0.0 || request.getMinAvailabilityPercentage() > 100.0)) {
            throw new BadRequestException("Minimum availability percentage must be between 0 and 100");
        }
    }
}
