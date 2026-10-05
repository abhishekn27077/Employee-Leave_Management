package com.example.employeeleave.controller;

import com.example.employeeleave.dto.TeamAvailabilityResponseDTO;
import com.example.employeeleave.security.SecurityService;
import com.example.employeeleave.service.TeamAvailabilityService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api")
public class TeamAvailabilityController {

    private final TeamAvailabilityService teamAvailabilityService;
    private final SecurityService securityService;

    public TeamAvailabilityController(TeamAvailabilityService teamAvailabilityService,
                                      SecurityService securityService) {
        this.teamAvailabilityService = teamAvailabilityService;
        this.securityService = securityService;
    }

    @GetMapping("/availability")
    public ResponseEntity<TeamAvailabilityResponseDTO> getAvailability(
            @RequestParam Long departmentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        securityService.validateDepartmentAvailabilityAccess(departmentId);
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        TeamAvailabilityResponseDTO result = teamAvailabilityService.getDepartmentAvailability(departmentId, targetDate);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/departments/{departmentId}/availability")
    public ResponseEntity<TeamAvailabilityResponseDTO> getDepartmentAvailability(
            @PathVariable Long departmentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        securityService.validateDepartmentAvailabilityAccess(departmentId);
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        TeamAvailabilityResponseDTO result = teamAvailabilityService.getDepartmentAvailability(departmentId, targetDate);
        return ResponseEntity.ok(result);
    }
}
