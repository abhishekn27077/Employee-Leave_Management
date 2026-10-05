package com.example.employeeleave.dto;

import com.example.employeeleave.entity.UserRole;

import java.time.LocalDateTime;

public class UserSummaryDTO {

    private Long id;
    private String username;
    private String email;
    private UserRole role;
    private boolean active;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String designation;
    private Long departmentId;
    private String departmentName;
    private LocalDateTime lastLoginAt;

    public UserSummaryDTO() {
    }

    public UserSummaryDTO(Long id, String username, String email, UserRole role, boolean active,
                          Long employeeId, String employeeCode, String employeeName,
                          String designation, Long departmentId, String departmentName,
                          LocalDateTime lastLoginAt) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = role;
        this.active = active;
        this.employeeId = employeeId;
        this.employeeCode = employeeCode;
        this.employeeName = employeeName;
        this.designation = designation;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.lastLoginAt = lastLoginAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
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

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
