package com.example.employeeleave.service;

import com.example.employeeleave.dto.EmployeeAvailabilityDTO;
import com.example.employeeleave.dto.TeamAvailabilityResponseDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TeamAvailabilityService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRepository leaveRepository;

    public TeamAvailabilityService(DepartmentRepository departmentRepository,
                                   EmployeeRepository employeeRepository,
                                   LeaveRepository leaveRepository) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
        this.leaveRepository = leaveRepository;
    }

    public TeamAvailabilityResponseDTO getDepartmentAvailability(Long departmentId, LocalDate date) {
        if (departmentId == null) {
            throw new BadRequestException("Department ID is required");
        }
        if (date == null) {
            throw new BadRequestException("Date is required");
        }

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));

        // Retrieve all employees in department
        List<Employee> departmentEmployees = employeeRepository.findByDepartmentId(departmentId);

        // Retrieve all APPROVED leaves covering the selected date for this department (single query to avoid N+1)
        List<Leave> approvedLeaves = leaveRepository.findActiveLeavesByDepartmentAndStatusOnDate(
                departmentId,
                LeaveStatus.APPROVED,
                date
        );

        Map<Long, Leave> employeeLeaveMap = new HashMap<>();
        for (Leave leave : approvedLeaves) {
            if (leave.getEmployee() != null) {
                employeeLeaveMap.put(leave.getEmployee().getId(), leave);
            }
        }

        List<EmployeeAvailabilityDTO> onLeaveEmployees = new ArrayList<>();
        List<EmployeeAvailabilityDTO> availableEmployees = new ArrayList<>();

        for (Employee emp : departmentEmployees) {
            Leave leave = employeeLeaveMap.get(emp.getId());
            if (leave != null) {
                onLeaveEmployees.add(new EmployeeAvailabilityDTO(
                        emp.getId(),
                        emp.getEmployeeId(),
                        emp.getName(),
                        emp.getDesignation(),
                        emp.getEmail(),
                        true,
                        leave.getLeaveType() != null ? leave.getLeaveType().getName() : "Leave",
                        leave.getReason()
                ));
            } else {
                availableEmployees.add(new EmployeeAvailabilityDTO(
                        emp.getId(),
                        emp.getEmployeeId(),
                        emp.getName(),
                        emp.getDesignation(),
                        emp.getEmail(),
                        false,
                        null,
                        null
                ));
            }
        }

        int totalEmployees = departmentEmployees.size();
        int onLeaveCount = onLeaveEmployees.size();
        int availableCount = totalEmployees - onLeaveCount;

        double percentage;
        if (totalEmployees == 0) {
            percentage = 100.0;
        } else {
            percentage = Math.round((availableCount * 100.0 / totalEmployees) * 10.0) / 10.0;
        }

        return new TeamAvailabilityResponseDTO(
                department.getId(),
                department.getName(),
                date,
                totalEmployees,
                onLeaveCount,
                availableCount,
                percentage,
                onLeaveEmployees,
                availableEmployees
        );
    }
}
