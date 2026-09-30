package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeaveRequestDTO;
import com.example.employeeleave.entity.Leave;
import com.example.employeeleave.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @PostMapping
    public ResponseEntity<Leave> applyLeave(@Valid @RequestBody LeaveRequestDTO request) {
        Leave createdLeave = leaveService.applyLeave(request);
        return new ResponseEntity<>(createdLeave, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Leave>> getAllLeaves() {
        List<Leave> leaves = leaveService.getAllLeaves();
        return ResponseEntity.ok(leaves);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Leave> getLeaveById(@PathVariable Long id) {
        Leave leave = leaveService.getLeaveById(id);
        return ResponseEntity.ok(leave);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Leave> approveLeave(@PathVariable Long id) {
        Leave approvedLeave = leaveService.approveLeave(id);
        return ResponseEntity.ok(approvedLeave);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Leave> rejectLeave(@PathVariable Long id) {
        Leave rejectedLeave = leaveService.rejectLeave(id);
        return ResponseEntity.ok(rejectedLeave);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Leave> cancelLeave(@PathVariable Long id) {
        Leave cancelledLeave = leaveService.cancelLeave(id);
        return ResponseEntity.ok(cancelledLeave);
    }
}
