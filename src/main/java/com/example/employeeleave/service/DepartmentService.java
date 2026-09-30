package com.example.employeeleave.service;

import com.example.employeeleave.entity.Department;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.DepartmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    public Department createDepartment(Department department) {
        if (department == null || department.getName() == null || department.getName().trim().isEmpty()) {
            throw new BadRequestException("Department name cannot be empty");
        }
        department.setName(department.getName().trim());
        department.setId(null);
        return departmentRepository.save(department);
    }

    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    public Department getDepartmentById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
    }

    public Department updateDepartment(Long id, Department departmentDetails) {
        Department existingDepartment = getDepartmentById(id);
        if (departmentDetails == null || departmentDetails.getName() == null || departmentDetails.getName().trim().isEmpty()) {
            throw new BadRequestException("Department name cannot be empty");
        }
        existingDepartment.setName(departmentDetails.getName().trim());
        return departmentRepository.save(existingDepartment);
    }

    public void deleteDepartment(Long id) {
        Department department = getDepartmentById(id);
        departmentRepository.delete(department);
    }
}
