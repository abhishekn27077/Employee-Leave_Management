package com.example.employeeleave.dto;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class TeamAvailabilityResponseDTO {

    private Long departmentId;
    private String departmentName;
    private LocalDate date;
    private int totalEmployees;
    private int onLeaveCount;
    private int availableCount;
    private double availabilityPercentage;
    private List<EmployeeAvailabilityDTO> onLeaveEmployees = new ArrayList<>();
    private List<EmployeeAvailabilityDTO> availableEmployees = new ArrayList<>();

    public TeamAvailabilityResponseDTO() {
    }

    public TeamAvailabilityResponseDTO(Long departmentId, String departmentName, LocalDate date,
                                       int totalEmployees, int onLeaveCount, int availableCount,
                                       double availabilityPercentage,
                                       List<EmployeeAvailabilityDTO> onLeaveEmployees,
                                       List<EmployeeAvailabilityDTO> availableEmployees) {
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.date = date;
        this.totalEmployees = totalEmployees;
        this.onLeaveCount = onLeaveCount;
        this.availableCount = availableCount;
        this.availabilityPercentage = availabilityPercentage;
        this.onLeaveEmployees = onLeaveEmployees != null ? onLeaveEmployees : new ArrayList<>();
        this.availableEmployees = availableEmployees != null ? availableEmployees : new ArrayList<>();
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

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
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

    public List<EmployeeAvailabilityDTO> getOnLeaveEmployees() {
        return onLeaveEmployees;
    }

    public void setOnLeaveEmployees(List<EmployeeAvailabilityDTO> onLeaveEmployees) {
        this.onLeaveEmployees = onLeaveEmployees;
    }

    public List<EmployeeAvailabilityDTO> getAvailableEmployees() {
        return availableEmployees;
    }

    public void setAvailableEmployees(List<EmployeeAvailabilityDTO> availableEmployees) {
        this.availableEmployees = availableEmployees;
    }
}
