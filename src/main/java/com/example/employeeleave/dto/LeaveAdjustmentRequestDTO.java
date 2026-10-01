package com.example.employeeleave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class LeaveAdjustmentRequestDTO {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Leave type ID is required")
    private Long leaveTypeId;

    @NotNull(message = "Adjustment days is required")
    private Integer adjustmentDays;

    @NotBlank(message = "Reason is required")
    private String reason;

    private String reference;

    private String actor;

    public LeaveAdjustmentRequestDTO() {
    }

    public LeaveAdjustmentRequestDTO(Long employeeId, Long leaveTypeId, Integer adjustmentDays, String reason, String reference) {
        this(employeeId, leaveTypeId, adjustmentDays, reason, reference, "SYSTEM");
    }

    public LeaveAdjustmentRequestDTO(Long employeeId, Long leaveTypeId, Integer adjustmentDays, String reason, String reference, String actor) {
        this.employeeId = employeeId;
        this.leaveTypeId = leaveTypeId;
        this.adjustmentDays = adjustmentDays;
        this.reason = reason;
        this.reference = reference;
        this.actor = actor;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public Long getLeaveTypeId() {
        return leaveTypeId;
    }

    public void setLeaveTypeId(Long leaveTypeId) {
        this.leaveTypeId = leaveTypeId;
    }

    public Integer getAdjustmentDays() {
        return adjustmentDays;
    }

    public void setAdjustmentDays(Integer adjustmentDays) {
        this.adjustmentDays = adjustmentDays;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getActor() {
        return actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }
}
