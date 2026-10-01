package com.example.employeeleave.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class LeaveConflictResponseDTO {

    private Long leaveId;
    private Long employeeId;
    private String employeeName;
    private Long leaveTypeId;
    private String leaveTypeName;
    private Long departmentId;
    private String departmentName;
    private LocalDate startDate;
    private LocalDate endDate;
    private int calculatedTotalDays;
    private int holidayCount;
    private int calculatedEffectiveDays;
    private Integer remainingBalance;
    private boolean canApprove;
    private List<ConflictDetailDTO> conflicts = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    private TeamAvailabilitySummaryDTO availabilityInfo;

    public LeaveConflictResponseDTO() {
    }

    public Long getLeaveId() {
        return leaveId;
    }

    public void setLeaveId(Long leaveId) {
        this.leaveId = leaveId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public Long getLeaveTypeId() {
        return leaveTypeId;
    }

    public void setLeaveTypeId(Long leaveTypeId) {
        this.leaveTypeId = leaveTypeId;
    }

    public String getLeaveTypeName() {
        return leaveTypeName;
    }

    public void setLeaveTypeName(String leaveTypeName) {
        this.leaveTypeName = leaveTypeName;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public int getCalculatedTotalDays() {
        return calculatedTotalDays;
    }

    public void setCalculatedTotalDays(int calculatedTotalDays) {
        this.calculatedTotalDays = calculatedTotalDays;
    }

    public int getHolidayCount() {
        return holidayCount;
    }

    public void setHolidayCount(int holidayCount) {
        this.holidayCount = holidayCount;
    }

    public int getCalculatedEffectiveDays() {
        return calculatedEffectiveDays;
    }

    public void setCalculatedEffectiveDays(int calculatedEffectiveDays) {
        this.calculatedEffectiveDays = calculatedEffectiveDays;
    }

    public Integer getRemainingBalance() {
        return remainingBalance;
    }

    public void setRemainingBalance(Integer remainingBalance) {
        this.remainingBalance = remainingBalance;
    }

    public boolean isCanApprove() {
        return canApprove;
    }

    public void setCanApprove(boolean canApprove) {
        this.canApprove = canApprove;
    }

    public List<ConflictDetailDTO> getConflicts() {
        return conflicts;
    }

    public void setConflicts(List<ConflictDetailDTO> conflicts) {
        this.conflicts = conflicts != null ? conflicts : new ArrayList<>();
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings != null ? warnings : new ArrayList<>();
    }

    public TeamAvailabilitySummaryDTO getAvailabilityInfo() {
        return availabilityInfo;
    }

    public void setAvailabilityInfo(TeamAvailabilitySummaryDTO availabilityInfo) {
        this.availabilityInfo = availabilityInfo;
    }
}
