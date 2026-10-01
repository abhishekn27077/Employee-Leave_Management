package com.example.employeeleave.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class LeavePolicyRequestDTO {

    @NotNull(message = "Leave type ID is required")
    private Long leaveTypeId;

    private Long departmentId;

    @NotNull(message = "Entitlement is required")
    @Positive(message = "Entitlement must be greater than 0")
    private Integer entitlement;

    @Positive(message = "Max consecutive days must be greater than 0")
    private Integer maxConsecutiveDays;

    private Boolean requiresApproval = true;

    private Double minAvailabilityPercentage;

    public LeavePolicyRequestDTO() {
    }

    public LeavePolicyRequestDTO(Long leaveTypeId, Long departmentId, Integer entitlement, Integer maxConsecutiveDays, Boolean requiresApproval) {
        this(leaveTypeId, departmentId, entitlement, maxConsecutiveDays, requiresApproval, null);
    }

    public LeavePolicyRequestDTO(Long leaveTypeId, Long departmentId, Integer entitlement, Integer maxConsecutiveDays, Boolean requiresApproval, Double minAvailabilityPercentage) {
        this.leaveTypeId = leaveTypeId;
        this.departmentId = departmentId;
        this.entitlement = entitlement;
        this.maxConsecutiveDays = maxConsecutiveDays;
        this.requiresApproval = requiresApproval != null ? requiresApproval : true;
        this.minAvailabilityPercentage = minAvailabilityPercentage;
    }

    public Long getLeaveTypeId() {
        return leaveTypeId;
    }

    public void setLeaveTypeId(Long leaveTypeId) {
        this.leaveTypeId = leaveTypeId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public Integer getEntitlement() {
        return entitlement;
    }

    public void setEntitlement(Integer entitlement) {
        this.entitlement = entitlement;
    }

    public Integer getMaxConsecutiveDays() {
        return maxConsecutiveDays;
    }

    public void setMaxConsecutiveDays(Integer maxConsecutiveDays) {
        this.maxConsecutiveDays = maxConsecutiveDays;
    }

    public Boolean getRequiresApproval() {
        return requiresApproval;
    }

    public void setRequiresApproval(Boolean requiresApproval) {
        this.requiresApproval = requiresApproval;
    }

    public Double getMinAvailabilityPercentage() {
        return minAvailabilityPercentage;
    }

    public void setMinAvailabilityPercentage(Double minAvailabilityPercentage) {
        this.minAvailabilityPercentage = minAvailabilityPercentage;
    }
}
