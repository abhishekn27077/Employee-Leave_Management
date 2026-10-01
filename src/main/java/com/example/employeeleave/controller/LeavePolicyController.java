package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeavePolicyRequestDTO;
import com.example.employeeleave.entity.LeavePolicy;
import com.example.employeeleave.service.LeavePolicyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leave-policies")
public class LeavePolicyController {

    private final LeavePolicyService leavePolicyService;

    public LeavePolicyController(LeavePolicyService leavePolicyService) {
        this.leavePolicyService = leavePolicyService;
    }

    @PostMapping
    public ResponseEntity<LeavePolicy> createLeavePolicy(@Valid @RequestBody LeavePolicyRequestDTO request) {
        LeavePolicy created = leavePolicyService.createLeavePolicy(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LeavePolicy>> getAllLeavePolicies() {
        List<LeavePolicy> policies = leavePolicyService.getAllLeavePolicies();
        return ResponseEntity.ok(policies);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeavePolicy> getLeavePolicyById(@PathVariable Long id) {
        LeavePolicy policy = leavePolicyService.getLeavePolicyById(id);
        return ResponseEntity.ok(policy);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeavePolicy> updateLeavePolicy(@PathVariable Long id, @Valid @RequestBody LeavePolicyRequestDTO request) {
        LeavePolicy updated = leavePolicyService.updateLeavePolicy(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLeavePolicy(@PathVariable Long id) {
        leavePolicyService.deleteLeavePolicy(id);
        return ResponseEntity.noContent().build();
    }
}
