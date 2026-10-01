package com.example.employeeleave.service;

import com.example.employeeleave.dto.LeaveBalanceRequestDTO;
import com.example.employeeleave.entity.Employee;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.entity.LeavePolicy;
import com.example.employeeleave.entity.LeaveType;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.EmployeeRepository;
import com.example.employeeleave.repository.LeaveBalanceRepository;
import com.example.employeeleave.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class LeaveBalanceService {

    private final LeaveBalanceRepository leaveBalanceRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeavePolicyService leavePolicyService;

    public LeaveBalanceService(LeaveBalanceRepository leaveBalanceRepository,
                               EmployeeRepository employeeRepository,
                               LeaveTypeRepository leaveTypeRepository,
                               LeavePolicyService leavePolicyService) {
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leavePolicyService = leavePolicyService;
    }

    @Transactional
    public LeaveBalance createOrInitBalance(LeaveBalanceRequestDTO request) {
        validateRequest(request);

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + request.getEmployeeId()));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found with id: " + request.getLeaveTypeId()));

        if (leaveBalanceRepository.existsByEmployeeIdAndLeaveTypeId(employee.getId(), leaveType.getId())) {
            throw new BadRequestException("Leave balance already exists for employee '" + employee.getName() +
                    "' and leave type '" + leaveType.getName() + "'");
        }

        LeaveBalance balance = new LeaveBalance(employee, leaveType, request.getEntitlement(), 0);
        return leaveBalanceRepository.save(balance);
    }

    public List<LeaveBalance> getAllBalances() {
        return leaveBalanceRepository.findAll();
    }

    public List<LeaveBalance> getBalancesByEmployee(Long employeeId) {
        if (!employeeRepository.existsById(employeeId)) {
            throw new ResourceNotFoundException("Employee not found with id: " + employeeId);
        }
        return leaveBalanceRepository.findByEmployeeId(employeeId);
    }

    public LeaveBalance getBalanceById(Long id) {
        return leaveBalanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave balance not found with id: " + id));
    }

    @Transactional
    public LeaveBalance getOrCreateBalance(Employee employee, LeaveType leaveType) {
        Optional<LeaveBalance> existing = leaveBalanceRepository.findByEmployeeIdAndLeaveTypeId(employee.getId(), leaveType.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        // Determine entitlement from applicable LeavePolicy or fallback to LeaveType default days
        int entitlement = leaveType.getDefaultDays() != null ? leaveType.getDefaultDays() : 0;
        Long deptId = employee.getDepartment() != null ? employee.getDepartment().getId() : null;
        Optional<LeavePolicy> policy = leavePolicyService.findApplicablePolicy(leaveType.getId(), deptId);
        if (policy.isPresent() && policy.get().getEntitlement() != null) {
            entitlement = policy.get().getEntitlement();
        }

        LeaveBalance newBalance = new LeaveBalance(employee, leaveType, entitlement, 0);
        return leaveBalanceRepository.save(newBalance);
    }

    public LeaveBalance checkBalance(Employee employee, LeaveType leaveType, int requestedDays) {
        LeaveBalance balance = getOrCreateBalance(employee, leaveType);
        if (balance.getRemainingBalance() < requestedDays) {
            throw new BadRequestException("Insufficient leave balance for '" + leaveType.getName() +
                    "'. Requested: " + requestedDays + " days, Available: " + balance.getRemainingBalance() + " days.");
        }
        return balance;
    }

    @Transactional
    public LeaveBalance deductApprovedDays(Employee employee, LeaveType leaveType, int requestedDays) {
        LeaveBalance balance = getOrCreateBalance(employee, leaveType);
        if (balance.getRemainingBalance() < requestedDays) {
            throw new BadRequestException("Cannot approve leave: Insufficient balance for '" + leaveType.getName() +
                    "'. Required: " + requestedDays + " days, Available: " + balance.getRemainingBalance() + " days.");
        }
        balance.setUsedDays(balance.getUsedDays() + requestedDays);
        balance.recalculateRemaining();
        return leaveBalanceRepository.save(balance);
    }

    private void validateRequest(LeaveBalanceRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Leave balance request body cannot be null");
        }
        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Employee ID is required");
        }
        if (request.getLeaveTypeId() == null) {
            throw new BadRequestException("Leave type ID is required");
        }
        if (request.getEntitlement() == null || request.getEntitlement() < 0) {
            throw new BadRequestException("Entitlement must be a non-negative number");
        }
    }
}
