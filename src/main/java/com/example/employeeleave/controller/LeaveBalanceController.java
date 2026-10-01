package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeaveBalanceRequestDTO;
import com.example.employeeleave.entity.LeaveBalance;
import com.example.employeeleave.service.LeaveBalanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leave-balances")
public class LeaveBalanceController {

    private final LeaveBalanceService leaveBalanceService;

    public LeaveBalanceController(LeaveBalanceService leaveBalanceService) {
        this.leaveBalanceService = leaveBalanceService;
    }

    @PostMapping
    public ResponseEntity<LeaveBalance> createOrInitBalance(@Valid @RequestBody LeaveBalanceRequestDTO request) {
        LeaveBalance created = leaveBalanceService.createOrInitBalance(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LeaveBalance>> getAllBalances(@RequestParam(required = false) Long employeeId) {
        if (employeeId != null) {
            return ResponseEntity.ok(leaveBalanceService.getBalancesByEmployee(employeeId));
        }
        return ResponseEntity.ok(leaveBalanceService.getAllBalances());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveBalance> getBalanceById(@PathVariable Long id) {
        LeaveBalance balance = leaveBalanceService.getBalanceById(id);
        return ResponseEntity.ok(balance);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveBalance>> getBalancesByEmployeeId(@PathVariable Long employeeId) {
        List<LeaveBalance> balances = leaveBalanceService.getBalancesByEmployee(employeeId);
        return ResponseEntity.ok(balances);
    }
}
