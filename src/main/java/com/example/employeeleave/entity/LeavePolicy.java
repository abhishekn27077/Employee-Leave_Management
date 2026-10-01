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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
@Table(name = "leave_policies")
public class LeavePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @NotNull(message = "Entitlement is required")
    @Positive(message = "Entitlement must be greater than 0")
    @Column(name = "entitlement", nullable = false)
    private Integer entitlement;

    @Column(name = "max_consecutive_days")
    private Integer maxConsecutiveDays;

    @Column(name = "requires_approval", nullable = false)
    private Boolean requiresApproval = true;

    @Column(name = "min_availability_percentage")
    private Double minAvailabilityPercentage;

    public LeavePolicy() {
    }

    public LeavePolicy(LeaveType leaveType, Department department, Integer entitlement, Integer maxConsecutiveDays, Boolean requiresApproval) {
        this(leaveType, department, entitlement, maxConsecutiveDays, requiresApproval, null);
    }

    public LeavePolicy(LeaveType leaveType, Department department, Integer entitlement, Integer maxConsecutiveDays, Boolean requiresApproval, Double minAvailabilityPercentage) {
        this.leaveType = leaveType;
        this.department = department;
        this.entitlement = entitlement;
        this.maxConsecutiveDays = maxConsecutiveDays;
        this.requiresApproval = requiresApproval != null ? requiresApproval : true;
        this.minAvailabilityPercentage = minAvailabilityPercentage;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LeaveType getLeaveType() {
        return leaveType;
    }

    public void setLeaveType(LeaveType leaveType) {
        this.leaveType = leaveType;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
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
