package com.example.employeeleave.security;

import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.exception.ForbiddenException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.exception.UnauthorizedException;
import com.example.employeeleave.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
public class SecurityService {

    private final EmployeeRepository employeeRepository;

    public SecurityService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    public UserAccount getCurrentUser() {
        return SecurityContext.getCurrentUser();
    }

    public UserAccount requireAuthenticated() {
        UserAccount user = SecurityContext.getCurrentUser();
        if (user == null) {
            throw new UnauthorizedException("Authentication token is required");
        }
        return user;
    }

    public void requireRole(UserRole... allowedRoles) {
        UserAccount user = requireAuthenticated();
        boolean match = Arrays.asList(allowedRoles).contains(user.getRole());
        if (!match) {
            throw new ForbiddenException("Access denied: Insufficient permissions for this operation");
        }
    }

    public boolean isHrAdmin() {
        UserAccount user = getCurrentUser();
        return user != null && user.getRole() == UserRole.HR_ADMIN;
    }

    public boolean isManager() {
        UserAccount user = getCurrentUser();
        return user != null && user.getRole() == UserRole.MANAGER;
    }

    public boolean isEmployee() {
        UserAccount user = getCurrentUser();
        return user != null && user.getRole() == UserRole.EMPLOYEE;
    }

    public void validateEmployeeAccess(Long targetEmployeeId) {
        UserAccount user = requireAuthenticated();
        if (user.getRole() == UserRole.HR_ADMIN) {
            return;
        }

        if (user.getEmployee() == null) {
            throw new ForbiddenException("User account is not linked to any employee record");
        }

        Long currentEmpId = user.getEmployee().getId();
        if (targetEmployeeId != null && targetEmployeeId.equals(currentEmpId)) {
            return;
        }

        if (user.getRole() == UserRole.MANAGER) {
            Employee targetEmployee = employeeRepository.findById(targetEmployeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + targetEmployeeId));

            Long managerDeptId = user.getEmployee().getDepartment() != null
                    ? user.getEmployee().getDepartment().getId()
                    : null;
            Long targetDeptId = targetEmployee.getDepartment() != null
                    ? targetEmployee.getDepartment().getId()
                    : null;

            if (managerDeptId != null && managerDeptId.equals(targetDeptId)) {
                return;
            }

            throw new ForbiddenException("Access denied: You can only view records for employees in your department team");
        }

        throw new ForbiddenException("Access denied: You can only access your own employee records");
    }

    public void validateCanApplyLeave(Long targetEmployeeId) {
        UserAccount user = requireAuthenticated();
        if (user.getRole() == UserRole.HR_ADMIN) {
            return;
        }

        if (user.getEmployee() == null) {
            throw new ForbiddenException("User account is not linked to any employee record");
        }

        if (!user.getEmployee().getId().equals(targetEmployeeId)) {
            throw new ForbiddenException("Access denied: You can only apply for leave for yourself");
        }
    }

    public void validateCanApproveOrReject(Leave leave) {
        UserAccount user = requireAuthenticated();

        if (user.getRole() == UserRole.EMPLOYEE) {
            throw new ForbiddenException("Access denied: Employees are not authorized to approve or reject leave requests");
        }

        if (user.getRole() == UserRole.MANAGER) {
            if (user.getEmployee() == null) {
                throw new ForbiddenException("Manager account is not linked to an employee record");
            }

            // A manager cannot approve their own leave
            if (leave.getEmployee() != null && leave.getEmployee().getId().equals(user.getEmployee().getId())) {
                throw new ForbiddenException("Access denied: Managers cannot approve or reject their own leave requests");
            }

            Long managerDeptId = user.getEmployee().getDepartment() != null
                    ? user.getEmployee().getDepartment().getId()
                    : null;
            Long leaveDeptId = (leave.getEmployee() != null && leave.getEmployee().getDepartment() != null)
                    ? leave.getEmployee().getDepartment().getId()
                    : null;

            if (managerDeptId == null || !managerDeptId.equals(leaveDeptId)) {
                throw new ForbiddenException("Access denied: Managers can only approve or reject leave requests for their own department team");
            }

            return;
        }

        if (user.getRole() == UserRole.HR_ADMIN) {
            return;
        }

        throw new ForbiddenException("Access denied: Insufficient permissions to process approvals");
    }

    public void validateCanCancelLeave(Leave leave) {
        UserAccount user = requireAuthenticated();
        if (user.getRole() == UserRole.HR_ADMIN) {
            return;
        }

        if (user.getEmployee() == null) {
            throw new ForbiddenException("User account is not linked to any employee record");
        }

        if (leave.getEmployee() == null || !leave.getEmployee().getId().equals(user.getEmployee().getId())) {
            throw new ForbiddenException("Access denied: You can only cancel your own pending leave requests");
        }
    }

    public void validateDepartmentAvailabilityAccess(Long departmentId) {
        UserAccount user = requireAuthenticated();
        if (user.getRole() == UserRole.HR_ADMIN) {
            return;
        }

        if (user.getEmployee() == null || user.getEmployee().getDepartment() == null) {
            throw new ForbiddenException("User account is not associated with any department");
        }

        if (!user.getEmployee().getDepartment().getId().equals(departmentId)) {
            throw new ForbiddenException("Access denied: You can only view team availability for your own department");
        }
    }
}
