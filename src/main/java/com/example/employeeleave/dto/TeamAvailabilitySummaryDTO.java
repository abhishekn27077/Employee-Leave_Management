package com.example.employeeleave.dto;

import java.time.LocalDate;

public class TeamAvailabilitySummaryDTO {
    private Long departmentId;
    private String departmentName;
    private int totalEmployees;
    private Double minProjectedAvailabilityPercentage;
    private Double thresholdPercentage;
    private LocalDate worstDate;

    public TeamAvailabilitySummaryDTO() {
    }

    public TeamAvailabilitySummaryDTO(Long departmentId, String departmentName, int totalEmployees,
                                      Double minProjectedAvailabilityPercentage, Double thresholdPercentage,
                                      LocalDate worstDate) {
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.totalEmployees = totalEmployees;
        this.minProjectedAvailabilityPercentage = minProjectedAvailabilityPercentage;
        this.thresholdPercentage = thresholdPercentage;
        this.worstDate = worstDate;
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

    public Double getMinProjectedAvailabilityPercentage() {
        return minProjectedAvailabilityPercentage;
    }

    public void setMinProjectedAvailabilityPercentage(Double minProjectedAvailabilityPercentage) {
        this.minProjectedAvailabilityPercentage = minProjectedAvailabilityPercentage;
    }

    public Double getThresholdPercentage() {
        return thresholdPercentage;
    }

    public void setThresholdPercentage(Double thresholdPercentage) {
        this.thresholdPercentage = thresholdPercentage;
    }

    public LocalDate getWorstDate() {
        return worstDate;
    }

    public void setWorstDate(LocalDate worstDate) {
        this.worstDate = worstDate;
    }
}
