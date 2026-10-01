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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

@Entity
@Table(name = "leave_balances", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"employee_id", "leave_type_id"})
})
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @NotNull(message = "Entitlement is required")
    @PositiveOrZero(message = "Entitlement cannot be negative")
    @Column(name = "entitlement", nullable = false)
    private Integer entitlement;

    @NotNull(message = "Used days is required")
    @PositiveOrZero(message = "Used days cannot be negative")
    @Column(name = "used_days", nullable = false)
    private Integer usedDays = 0;

    @NotNull(message = "Remaining balance is required")
    @Column(name = "remaining_balance", nullable = false)
    private Integer remainingBalance;

    public LeaveBalance() {
    }

    public LeaveBalance(Employee employee, LeaveType leaveType, Integer entitlement, Integer usedDays) {
        this.employee = employee;
        this.leaveType = leaveType;
        this.entitlement = entitlement;
        this.usedDays = usedDays != null ? usedDays : 0;
        this.remainingBalance = (this.entitlement != null ? this.entitlement : 0) - this.usedDays;
    }

    public void recalculateRemaining() {
        int total = this.entitlement != null ? this.entitlement : 0;
        int used = this.usedDays != null ? this.usedDays : 0;
        this.remainingBalance = total - used;
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

    public Integer getEntitlement() {
        return entitlement;
    }

    public void setEntitlement(Integer entitlement) {
        this.entitlement = entitlement;
        recalculateRemaining();
    }

    public Integer getUsedDays() {
        return usedDays;
    }

    public void setUsedDays(Integer usedDays) {
        this.usedDays = usedDays;
        recalculateRemaining();
    }

    public Integer getRemainingBalance() {
        return remainingBalance;
    }

    public void setRemainingBalance(Integer remainingBalance) {
        this.remainingBalance = remainingBalance;
    }
}
