package com.example.employeeleave.controller;

import com.example.employeeleave.dto.HolidayRequestDTO;
import com.example.employeeleave.entity.Holiday;
import com.example.employeeleave.service.HolidayService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/holidays")
public class HolidayController {

    private final HolidayService holidayService;

    public HolidayController(HolidayService holidayService) {
        this.holidayService = holidayService;
    }

    @PostMapping
    public ResponseEntity<Holiday> createHoliday(@Valid @RequestBody HolidayRequestDTO request) {
        Holiday created = holidayService.createHoliday(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Holiday>> getAllHolidays() {
        List<Holiday> holidays = holidayService.getAllHolidays();
        return ResponseEntity.ok(holidays);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Holiday> getHolidayById(@PathVariable Long id) {
        Holiday holiday = holidayService.getHolidayById(id);
        return ResponseEntity.ok(holiday);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Holiday> updateHoliday(@PathVariable Long id, @Valid @RequestBody HolidayRequestDTO request) {
        Holiday updated = holidayService.updateHoliday(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/range")
    public ResponseEntity<List<Holiday>> getHolidaysBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        List<Holiday> holidays = holidayService.getHolidaysBetween(start, end);
        return ResponseEntity.ok(holidays);
    }
}
