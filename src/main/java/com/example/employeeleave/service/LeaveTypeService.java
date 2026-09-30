package com.example.employeeleave.service;

import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LeaveTypeService {

    private final LeaveTypeRepository leaveTypeRepository;

    public LeaveTypeService(LeaveTypeRepository leaveTypeRepository) {
        this.leaveTypeRepository = leaveTypeRepository;
    }

    public LeaveType createLeaveType(LeaveType leaveType) {
        validateLeaveType(leaveType);

        String trimmedName = leaveType.getName().trim();
        if (leaveTypeRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new BadRequestException("Leave type with name '" + trimmedName + "' already exists");
        }

        leaveType.setName(trimmedName);
        if (leaveType.getDescription() != null) {
            leaveType.setDescription(leaveType.getDescription().trim());
        }
        leaveType.setId(null);

        return leaveTypeRepository.save(leaveType);
    }

    public List<LeaveType> getAllLeaveTypes() {
        return leaveTypeRepository.findAll();
    }

    public LeaveType getLeaveTypeById(Long id) {
        return leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + id));
    }

    public LeaveType updateLeaveType(Long id, LeaveType leaveTypeDetails) {
        LeaveType existingLeaveType = getLeaveTypeById(id);
        validateLeaveType(leaveTypeDetails);

        String trimmedName = leaveTypeDetails.getName().trim();
        if (!existingLeaveType.getName().equalsIgnoreCase(trimmedName)
                && leaveTypeRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new BadRequestException("Leave type with name '" + trimmedName + "' already exists");
        }

        existingLeaveType.setName(trimmedName);
        existingLeaveType.setDescription(
                leaveTypeDetails.getDescription() != null ? leaveTypeDetails.getDescription().trim() : null
        );
        existingLeaveType.setDefaultDays(leaveTypeDetails.getDefaultDays());

        return leaveTypeRepository.save(existingLeaveType);
    }

    public void deleteLeaveType(Long id) {
        LeaveType leaveType = getLeaveTypeById(id);
        leaveTypeRepository.delete(leaveType);
    }

    private void validateLeaveType(LeaveType leaveType) {
        if (leaveType == null) {
            throw new BadRequestException("Leave type body cannot be null");
        }
        if (leaveType.getName() == null || leaveType.getName().trim().isEmpty()) {
            throw new BadRequestException("Leave type name is required");
        }
        if (leaveType.getDefaultDays() == null) {
            throw new BadRequestException("Default days is required");
        }
        if (leaveType.getDefaultDays() <= 0) {
            throw new BadRequestException("Default days must be a positive number greater than 0");
        }
    }
}
