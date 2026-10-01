package com.example.employeeleave.dto;

public class EmployeeAvailabilityDTO {

    private Long id;
    private String employeeId;
    private String name;
    private String designation;
    private String email;
    private boolean onLeave;
    private String leaveType;
    private String leaveReason;

    public EmployeeAvailabilityDTO() {
    }

    public EmployeeAvailabilityDTO(Long id, String employeeId, String name, String designation, String email, boolean onLeave, String leaveType, String leaveReason) {
        this.id = id;
        this.employeeId = employeeId;
        this.name = name;
        this.designation = designation;
        this.email = email;
        this.onLeave = onLeave;
        this.leaveType = leaveType;
        this.leaveReason = leaveReason;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isOnLeave() {
        return onLeave;
    }

    public void setOnLeave(boolean onLeave) {
        this.onLeave = onLeave;
    }

    public String getLeaveType() {
        return leaveType;
    }

    public void setLeaveType(String leaveType) {
        this.leaveType = leaveType;
    }

    public String getLeaveReason() {
        return leaveReason;
    }

    public void setLeaveReason(String leaveReason) {
        this.leaveReason = leaveReason;
    }
}
