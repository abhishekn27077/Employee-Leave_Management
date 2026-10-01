package com.example.employeeleave.controller;

import com.example.employeeleave.dto.LeaveAdjustmentRequestDTO;
import com.example.employeeleave.entity.LeaveAdjustment;
import com.example.employeeleave.service.LeaveAdjustmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leave-adjustments")
@CrossOrigin(origins = "*")
public class LeaveAdjustmentController {

    private final LeaveAdjustmentService adjustmentService;

    public LeaveAdjustmentController(LeaveAdjustmentService adjustmentService) {
        this.adjustmentService = adjustmentService;
    }

    @PostMapping
    public ResponseEntity<LeaveAdjustment> createAdjustment(@Valid @RequestBody LeaveAdjustmentRequestDTO dto) {
        LeaveAdjustment created = adjustmentService.createAdjustment(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<LeaveAdjustment>> getAllAdjustments() {
        return ResponseEntity.ok(adjustmentService.getAllAdjustments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveAdjustment> getAdjustmentById(@PathVariable Long id) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentById(id));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveAdjustment>> getAdjustmentsByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByEmployee(employeeId));
    }
}
