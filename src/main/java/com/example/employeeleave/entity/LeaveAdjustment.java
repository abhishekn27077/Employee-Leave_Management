package com.example.employeeleave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Entity
@Table(name = "leave_adjustments")
public class LeaveAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @NotNull(message = "Adjustment days is required")
    @Column(name = "adjustment_days", nullable = false)
    private Integer adjustmentDays;

    @NotBlank(message = "Reason is required")
    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "reference", length = 100)
    private String reference;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public LeaveAdjustment() {
    }

    public LeaveAdjustment(Employee employee, LeaveType leaveType, Integer adjustmentDays, String reason, String reference) {
        this(employee, leaveType, adjustmentDays, reason, reference, LocalDateTime.now());
    }

    public LeaveAdjustment(Employee employee, LeaveType leaveType, Integer adjustmentDays, String reason, String reference, LocalDateTime createdAt) {
        this.employee = employee;
        this.leaveType = leaveType;
        this.adjustmentDays = adjustmentDays;
        this.reason = reason;
        this.reference = reference;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public LeaveType getLeaveType() {
        return leaveType;
    }

    public void setLeaveType(LeaveType leaveType) {
        this.leaveType = leaveType;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
