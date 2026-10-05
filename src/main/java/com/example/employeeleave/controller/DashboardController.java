package com.example.employeeleave.controller;

import com.example.employeeleave.dto.DashboardOverviewDTO;
import com.example.employeeleave.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/overview")
    public ResponseEntity<DashboardOverviewDTO> getDashboardOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        DashboardOverviewDTO overview = dashboardService.getDashboardOverview(date);
        return ResponseEntity.ok(overview);
    }
}
