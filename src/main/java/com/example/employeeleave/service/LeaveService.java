package com.example.employeeleave.service;

import com.example.employeeleave.dto.LeaveRequestDTO;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.entity.LeaveStatus;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LeaveService {

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;

    public LeaveService(LeaveRepository leaveRepository, EmployeeRepository employeeRepository, LeaveTypeRepository leaveTypeRepository) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
    }

    public Leave applyLeave(LeaveRequestDTO request) {
        validateLeaveRequest(request);

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId()));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        Leave leave = new Leave();
        leave.setEmployee(employee);
        leave.setLeaveType(leaveType);
        leave.setStartDate(request.getStartDate());
        leave.setEndDate(request.getEndDate());
        leave.setReason(request.getReason().trim());
        leave.setStatus(LeaveStatus.PENDING);
        leave.setAppliedAt(LocalDateTime.now());

        return leaveRepository.save(leave);
    }

    public List<Leave> getAllLeaves() {
        return leaveRepository.findAll();
    }

    public Leave getLeaveById(Long id) {
        return leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found with id: " + id));
    }

    public Leave approveLeave(Long id) {
        Leave leave = getLeaveById(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Cannot approve leave with status: " + leave.getStatus() + ". Only PENDING leaves can be approved.");
        }
        leave.setStatus(LeaveStatus.APPROVED);
        return leaveRepository.save(leave);
    }

    public Leave rejectLeave(Long id) {
        Leave leave = getLeaveById(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Cannot reject leave with status: " + leave.getStatus() + ". Only PENDING leaves can be rejected.");
        }
        leave.setStatus(LeaveStatus.REJECTED);
        return leaveRepository.save(leave);
    }

    public Leave cancelLeave(Long id) {
        Leave leave = getLeaveById(id);
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Cannot cancel leave with status: " + leave.getStatus() + ". Only PENDING leaves can be cancelled.");
        }
        leave.setStatus(LeaveStatus.CANCELLED);
        return leaveRepository.save(leave);
    }

    private void validateLeaveRequest(LeaveRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Leave request body cannot be null");
        }
        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Employee ID is required");
        }
        if (request.getLeaveTypeId() == null) {
            throw new BadRequestException("Leave type ID is required");
        }
        if (request.getStartDate() == null) {
            throw new BadRequestException("Start date is required");
        }
        if (request.getEndDate() == null) {
            throw new BadRequestException("End date is required");
        }
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date cannot be before start date");
        }
        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new BadRequestException("Reason cannot be blank");
        }
    }
}
