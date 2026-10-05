package com.example.employeeleave.service;

import com.example.employeeleave.dto.EmployeeRequestDTO;
import com.example.employeeleave.entity.Department;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import com.example.employeeleave.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class EmployeeService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    public EmployeeService(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
    }

    public Employee createEmployee(EmployeeRequestDTO request) {
        validateEmployeeRequest(request);

        String trimmedEmployeeId = request.getEmployeeId().trim();
        if (employeeRepository.existsByEmployeeId(trimmedEmployeeId)) {
            throw new BadRequestException("Employee ID already exists: " + trimmedEmployeeId);
        }

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));

        Employee employee = new Employee();
        employee.setEmployeeId(trimmedEmployeeId);
        employee.setName(request.getName().trim());
        employee.setEmail(request.getEmail().trim().toLowerCase());
        employee.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        employee.setDesignation(request.getDesignation() != null ? request.getDesignation().trim() : null);
        employee.setJoiningDate(request.getJoiningDate());
        employee.setDepartment(department);

        return employeeRepository.save(employee);
    }

    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    public List<Employee> getEmployeesByDepartment(Long departmentId) {
        return employeeRepository.findByDepartmentId(departmentId);
    }

    public Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
    }

    public Employee updateEmployee(Long id, EmployeeRequestDTO request) {
        Employee existingEmployee = getEmployeeById(id);
        validateEmployeeRequest(request);

        String trimmedEmployeeId = request.getEmployeeId().trim();
        if (!existingEmployee.getEmployeeId().equalsIgnoreCase(trimmedEmployeeId)
                && employeeRepository.existsByEmployeeId(trimmedEmployeeId)) {
            throw new BadRequestException("Employee ID already exists: " + trimmedEmployeeId);
        }

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));

        existingEmployee.setEmployeeId(trimmedEmployeeId);
        existingEmployee.setName(request.getName().trim());
        existingEmployee.setEmail(request.getEmail().trim().toLowerCase());
        existingEmployee.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        existingEmployee.setDesignation(request.getDesignation() != null ? request.getDesignation().trim() : null);
        existingEmployee.setJoiningDate(request.getJoiningDate());
        existingEmployee.setDepartment(department);

        return employeeRepository.save(existingEmployee);
    }

    public void deleteEmployee(Long id) {
        Employee employee = getEmployeeById(id);
        employeeRepository.delete(employee);
    }

    private void validateEmployeeRequest(EmployeeRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Employee request body cannot be null");
        }
        if (request.getEmployeeId() == null || request.getEmployeeId().trim().isEmpty()) {
            throw new BadRequestException("Employee ID cannot be blank");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("Employee name cannot be blank");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new BadRequestException("Email cannot be blank");
        }
        if (!EMAIL_PATTERN.matcher(request.getEmail().trim()).matches()) {
            throw new BadRequestException("Invalid email format: " + request.getEmail());
        }
        if (request.getDepartmentId() == null) {
            throw new BadRequestException("Department ID is required");
        }
    }
}
