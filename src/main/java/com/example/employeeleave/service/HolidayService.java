package com.example.employeeleave.service;

import com.example.employeeleave.dto.HolidayRequestDTO;
import com.example.employeeleave.entity.Holiday;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.HolidayRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class HolidayService {

    private final HolidayRepository holidayRepository;

    public HolidayService(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    public Holiday createHoliday(HolidayRequestDTO request) {
        validateRequest(request);

        if (holidayRepository.existsByHolidayDate(request.getHolidayDate())) {
            throw new BadRequestException("A holiday already exists on date: " + request.getHolidayDate());
        }

        Holiday holiday = new Holiday(
                request.getHolidayDate(),
                request.getName().trim(),
                request.getDescription() != null ? request.getDescription().trim() : null
        );

        return holidayRepository.save(holiday);
    }

    public List<Holiday> getAllHolidays() {
        return holidayRepository.findAllByOrderByHolidayDateAsc();
    }

    public Holiday getHolidayById(Long id) {
        return holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found with id: " + id));
    }

    public Holiday updateHoliday(Long id, HolidayRequestDTO request) {
        Holiday existing = getHolidayById(id);
        validateRequest(request);

        if (!existing.getHolidayDate().equals(request.getHolidayDate())
                && holidayRepository.existsByHolidayDate(request.getHolidayDate())) {
            throw new BadRequestException("A holiday already exists on date: " + request.getHolidayDate());
        }

        existing.setHolidayDate(request.getHolidayDate());
        existing.setName(request.getName().trim());
        existing.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);

        return holidayRepository.save(existing);
    }

    public void deleteHoliday(Long id) {
        Holiday holiday = getHolidayById(id);
        holidayRepository.delete(holiday);
    }

    public long countHolidaysBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return 0;
        }
        return holidayRepository.countByHolidayDateBetween(startDate, endDate);
    }

    public List<Holiday> getHolidaysBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return List.of();
        }
        return holidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(startDate, endDate);
    }

    private void validateRequest(HolidayRequestDTO request) {
        if (request == null) {
            throw new BadRequestException("Holiday request body cannot be null");
        }
        if (request.getHolidayDate() == null) {
            throw new BadRequestException("Holiday date is required");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("Holiday name is required");
        }
    }
}
