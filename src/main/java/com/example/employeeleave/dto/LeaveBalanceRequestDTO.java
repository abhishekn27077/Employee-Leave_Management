package com.example.employeeleave.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public class LeaveBalanceRequestDTO {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Leave type ID is required")
    private Long leaveTypeId;

    @NotNull(message = "Entitlement is required")
    @PositiveOrZero(message = "Entitlement cannot be negative")
    private Integer entitlement;

    public LeaveBalanceRequestDTO() {
    }

    public LeaveBalanceRequestDTO(Long employeeId, Long leaveTypeId, Integer entitlement) {
        this.employeeId = employeeId;
        this.leaveTypeId = leaveTypeId;
        this.entitlement = entitlement;
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

    public Integer getEntitlement() {
        return entitlement;
    }

    public void setEntitlement(Integer entitlement) {
        this.entitlement = entitlement;
    }
}
