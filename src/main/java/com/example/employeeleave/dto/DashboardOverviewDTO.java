package com.example.employeeleave.dto;

import com.example.employeeleave.entity.Leave;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DashboardOverviewDTO {

    // Headcount & structure
    private int totalEmployees;
    private int totalDepartments;
    private int totalLeaveTypes;
    private int totalPolicies;

    // Leave request counts
    private int totalLeaves;
    private int pendingLeaves;
    private int approvedLeaves;
    private int rejectedLeaves;
    private int cancelledLeaves;
    private double approvalRate;

    // Balance & utilization
    private int totalEntitlementDays;
    private int totalUsedDays;
    private int totalRemainingDays;
    private double utilizationPercentage;

    // Organization availability (today)
    private LocalDate availabilityDate;
    private int totalAvailableEmployees;
    private int totalOnLeaveEmployees;
    private double organizationAvailabilityPercentage;
    private List<DepartmentAvailabilityItemDTO> departmentAvailability = new ArrayList<>();

    // Conflict detection on pending requests
    private int pendingWithConflictsCount;
    private List<ConflictSummaryDTO> detectedConflicts = new ArrayList<>();

    // Upcoming approved leaves
    private List<UpcomingLeaveDTO> upcomingApprovedLeaves = new ArrayList<>();

    // Recent activity (Audit History)
    private List<RecentActivityDTO> recentActivity = new ArrayList<>();

    // Recent leaves
    private List<Leave> recentLeaves = new ArrayList<>();

    public DashboardOverviewDTO() {
    }

    // Nested DTOs
    public static class DepartmentAvailabilityItemDTO {
        private Long departmentId;
        private String departmentName;
        private int totalEmployees;
        private int onLeaveCount;
        private int availableCount;
        private double availabilityPercentage;

        public DepartmentAvailabilityItemDTO() {
        }

        public DepartmentAvailabilityItemDTO(Long departmentId, String departmentName, int totalEmployees,
                                             int onLeaveCount, int availableCount, double availabilityPercentage) {
            this.departmentId = departmentId;
            this.departmentName = departmentName;
            this.totalEmployees = totalEmployees;
            this.onLeaveCount = onLeaveCount;
            this.availableCount = availableCount;
            this.availabilityPercentage = availabilityPercentage;
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

        public int getTotalEmployees() {
            return totalEmployees;
        }

        public void setTotalEmployees(int totalEmployees) {
            this.totalEmployees = totalEmployees;
        }

        public int getOnLeaveCount() {
            return onLeaveCount;
        }

        public void setOnLeaveCount(int onLeaveCount) {
            this.onLeaveCount = onLeaveCount;
        }

        public int getAvailableCount() {
            return availableCount;
        }

        public void setAvailableCount(int availableCount) {
            this.availableCount = availableCount;
        }

        public double getAvailabilityPercentage() {
            return availabilityPercentage;
        }

        public void setAvailabilityPercentage(double availabilityPercentage) {
            this.availabilityPercentage = availabilityPercentage;
        }
    }

    public static class UpcomingLeaveDTO {
        private Long id;
        private Long employeeId;
        private String employeeName;
        private String departmentName;
        private String leaveTypeName;
        private LocalDate startDate;
        private LocalDate endDate;
        private int days;
        private String reason;

        public UpcomingLeaveDTO() {
        }

        public UpcomingLeaveDTO(Long id, Long employeeId, String employeeName, String departmentName,
                                String leaveTypeName, LocalDate startDate, LocalDate endDate, int days, String reason) {
            this.id = id;
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.departmentName = departmentName;
            this.leaveTypeName = leaveTypeName;
            this.startDate = startDate;
            this.endDate = endDate;
            this.days = days;
            this.reason = reason;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
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

        public String getDepartmentName() {
            return departmentName;
        }

        public void setDepartmentName(String departmentName) {
            this.departmentName = departmentName;
        }

        public String getLeaveTypeName() {
            return leaveTypeName;
        }

        public void setLeaveTypeName(String leaveTypeName) {
            this.leaveTypeName = leaveTypeName;
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

        public int getDays() {
            return days;
        }

        public void setDays(int days) {
            this.days = days;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class ConflictSummaryDTO {
        private Long leaveId;
        private String employeeName;
        private String departmentName;
        private String leaveTypeName;
        private LocalDate startDate;
        private LocalDate endDate;
        private boolean canApprove;
        private List<ConflictDetailDTO> conflicts = new ArrayList<>();
        private List<String> warnings = new ArrayList<>();

        public ConflictSummaryDTO() {
        }

        public ConflictSummaryDTO(Long leaveId, String employeeName, String departmentName,
                                  String leaveTypeName, LocalDate startDate, LocalDate endDate,
                                  boolean canApprove, List<ConflictDetailDTO> conflicts, List<String> warnings) {
            this.leaveId = leaveId;
            this.employeeName = employeeName;
            this.departmentName = departmentName;
            this.leaveTypeName = leaveTypeName;
            this.startDate = startDate;
            this.endDate = endDate;
            this.canApprove = canApprove;
            this.conflicts = conflicts;
            this.warnings = warnings;
        }

        public Long getLeaveId() {
            return leaveId;
        }

        public void setLeaveId(Long leaveId) {
            this.leaveId = leaveId;
        }

        public String getEmployeeName() {
            return employeeName;
        }

        public void setEmployeeName(String employeeName) {
            this.employeeName = employeeName;
        }

        public String getDepartmentName() {
            return departmentName;
        }

        public void setDepartmentName(String departmentName) {
            this.departmentName = departmentName;
        }

        public String getLeaveTypeName() {
            return leaveTypeName;
        }

        public void setLeaveTypeName(String leaveTypeName) {
            this.leaveTypeName = leaveTypeName;
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
            this.conflicts = conflicts;
        }

        public List<String> getWarnings() {
            return warnings;
        }

        public void setWarnings(List<String> warnings) {
            this.warnings = warnings;
        }
    }

    public static class RecentActivityDTO {
        private Long id;
        private String actor;
        private String action;
        private String entityType;
        private Long entityId;
        private String oldValue;
        private String newValue;
        private String description;
        private LocalDateTime timestamp;

        public RecentActivityDTO() {
        }

        public RecentActivityDTO(Long id, String actor, String action, String entityType,
                                 Long entityId, String oldValue, String newValue, String description,
                                 LocalDateTime timestamp) {
            this.id = id;
            this.actor = actor;
            this.action = action;
            this.entityType = entityType;
            this.entityId = entityId;
            this.oldValue = oldValue;
            this.newValue = newValue;
            this.description = description;
            this.timestamp = timestamp;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getActor() {
            return actor;
        }

        public void setActor(String actor) {
            this.actor = actor;
        }

        public String getAction() {
            return action;
        }

        public void setAction(String action) {
            this.action = action;
        }

        public String getEntityType() {
            return entityType;
        }

        public void setEntityType(String entityType) {
            this.entityType = entityType;
        }

        public Long getEntityId() {
            return entityId;
        }

        public void setEntityId(Long entityId) {
            this.entityId = entityId;
        }

        public String getOldValue() {
            return oldValue;
        }

        public void setOldValue(String oldValue) {
            this.oldValue = oldValue;
        }

        public String getNewValue() {
            return newValue;
        }

        public void setNewValue(String newValue) {
            this.newValue = newValue;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public LocalDateTime getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }
    }

    // Getters and Setters
    public int getTotalEmployees() {
        return totalEmployees;
    }

    public void setTotalEmployees(int totalEmployees) {
        this.totalEmployees = totalEmployees;
    }

    public int getTotalDepartments() {
        return totalDepartments;
    }

    public void setTotalDepartments(int totalDepartments) {
        this.totalDepartments = totalDepartments;
    }

    public int getTotalLeaveTypes() {
        return totalLeaveTypes;
    }

    public void setTotalLeaveTypes(int totalLeaveTypes) {
        this.totalLeaveTypes = totalLeaveTypes;
    }

    public int getTotalPolicies() {
        return totalPolicies;
    }

    public void setTotalPolicies(int totalPolicies) {
        this.totalPolicies = totalPolicies;
    }

    public int getTotalLeaves() {
        return totalLeaves;
    }

    public void setTotalLeaves(int totalLeaves) {
        this.totalLeaves = totalLeaves;
    }

    public int getPendingLeaves() {
        return pendingLeaves;
    }

    public void setPendingLeaves(int pendingLeaves) {
        this.pendingLeaves = pendingLeaves;
    }

    public int getApprovedLeaves() {
        return approvedLeaves;
    }

    public void setApprovedLeaves(int approvedLeaves) {
        this.approvedLeaves = approvedLeaves;
    }

    public int getRejectedLeaves() {
        return rejectedLeaves;
    }

    public void setRejectedLeaves(int rejectedLeaves) {
        this.rejectedLeaves = rejectedLeaves;
    }

    public int getCancelledLeaves() {
        return cancelledLeaves;
    }

    public void setCancelledLeaves(int cancelledLeaves) {
        this.cancelledLeaves = cancelledLeaves;
    }

    public double getApprovalRate() {
        return approvalRate;
    }

    public void setApprovalRate(double approvalRate) {
        this.approvalRate = approvalRate;
    }

    public int getTotalEntitlementDays() {
        return totalEntitlementDays;
    }

    public void setTotalEntitlementDays(int totalEntitlementDays) {
        this.totalEntitlementDays = totalEntitlementDays;
    }

    public int getTotalUsedDays() {
        return totalUsedDays;
    }

    public void setTotalUsedDays(int totalUsedDays) {
        this.totalUsedDays = totalUsedDays;
    }

    public int getTotalRemainingDays() {
        return totalRemainingDays;
    }

    public void setTotalRemainingDays(int totalRemainingDays) {
        this.totalRemainingDays = totalRemainingDays;
    }

    public double getUtilizationPercentage() {
        return utilizationPercentage;
    }

    public void setUtilizationPercentage(double utilizationPercentage) {
        this.utilizationPercentage = utilizationPercentage;
    }

    public LocalDate getAvailabilityDate() {
        return availabilityDate;
    }

    public void setAvailabilityDate(LocalDate availabilityDate) {
        this.availabilityDate = availabilityDate;
    }

    public int getTotalAvailableEmployees() {
        return totalAvailableEmployees;
    }

    public void setTotalAvailableEmployees(int totalAvailableEmployees) {
        this.totalAvailableEmployees = totalAvailableEmployees;
    }

    public int getTotalOnLeaveEmployees() {
        return totalOnLeaveEmployees;
    }

    public void setTotalOnLeaveEmployees(int totalOnLeaveEmployees) {
        this.totalOnLeaveEmployees = totalOnLeaveEmployees;
    }

    public double getOrganizationAvailabilityPercentage() {
        return organizationAvailabilityPercentage;
    }

    public void setOrganizationAvailabilityPercentage(double organizationAvailabilityPercentage) {
        this.organizationAvailabilityPercentage = organizationAvailabilityPercentage;
    }

    public List<DepartmentAvailabilityItemDTO> getDepartmentAvailability() {
        return departmentAvailability;
    }

    public void setDepartmentAvailability(List<DepartmentAvailabilityItemDTO> departmentAvailability) {
        this.departmentAvailability = departmentAvailability;
    }

    public int getPendingWithConflictsCount() {
        return pendingWithConflictsCount;
    }

    public void setPendingWithConflictsCount(int pendingWithConflictsCount) {
        this.pendingWithConflictsCount = pendingWithConflictsCount;
    }

    public List<ConflictSummaryDTO> getDetectedConflicts() {
        return detectedConflicts;
    }

    public void setDetectedConflicts(List<ConflictSummaryDTO> detectedConflicts) {
        this.detectedConflicts = detectedConflicts;
    }

    public List<UpcomingLeaveDTO> getUpcomingApprovedLeaves() {
        return upcomingApprovedLeaves;
    }

    public void setUpcomingApprovedLeaves(List<UpcomingLeaveDTO> upcomingApprovedLeaves) {
        this.upcomingApprovedLeaves = upcomingApprovedLeaves;
    }

    public List<RecentActivityDTO> getRecentActivity() {
        return recentActivity;
    }

    public void setRecentActivity(List<RecentActivityDTO> recentActivity) {
        this.recentActivity = recentActivity;
    }

    public List<Leave> getRecentLeaves() {
        return recentLeaves;
    }

    public void setRecentLeaves(List<Leave> recentLeaves) {
        this.recentLeaves = recentLeaves;
    }
}
