package com.example.employeeleave.service;

import com.example.employeeleave.dto.HolidayRequestDTO;
import com.example.employeeleave.entity.Holiday;
import com.example.employeeleave.exception.BadRequestException;
import com.example.employeeleave.exception.ResourceNotFoundException;
import com.example.employeeleave.repository.HolidayRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HolidayServiceTest {

    @Mock
    private HolidayRepository holidayRepository;

    @InjectMocks
    private HolidayService holidayService;

    private Holiday holiday;

    @BeforeEach
    void setUp() {
        holiday = new Holiday(LocalDate.of(2026, 12, 25), "Christmas Day", "Public holiday");
        holiday.setId(1L);
    }

    @Test
    void testCreateHoliday_Success() {
        HolidayRequestDTO request = new HolidayRequestDTO(LocalDate.of(2026, 12, 25), "Christmas Day", "Public holiday");
        when(holidayRepository.existsByHolidayDate(request.getHolidayDate())).thenReturn(false);
        when(holidayRepository.save(any(Holiday.class))).thenReturn(holiday);

        Holiday created = holidayService.createHoliday(request);

        assertNotNull(created);
        assertEquals("Christmas Day", created.getName());
        assertEquals(LocalDate.of(2026, 12, 25), created.getHolidayDate());
        verify(holidayRepository, times(1)).save(any(Holiday.class));
    }

    @Test
    void testCreateHoliday_DuplicateDate_ThrowsBadRequestException() {
        HolidayRequestDTO request = new HolidayRequestDTO(LocalDate.of(2026, 12, 25), "Christmas Day", "Public holiday");
        when(holidayRepository.existsByHolidayDate(request.getHolidayDate())).thenReturn(true);

        assertThrows(BadRequestException.class, () -> holidayService.createHoliday(request));
        verify(holidayRepository, never()).save(any(Holiday.class));
    }

    @Test
    void testGetAllHolidays() {
        when(holidayRepository.findAllByOrderByHolidayDateAsc()).thenReturn(Arrays.asList(holiday));

        List<Holiday> list = holidayService.getAllHolidays();

        assertEquals(1, list.size());
        verify(holidayRepository, times(1)).findAllByOrderByHolidayDateAsc();
    }

    @Test
    void testGetHolidayById_Found() {
        when(holidayRepository.findById(1L)).thenReturn(Optional.of(holiday));

        Holiday found = holidayService.getHolidayById(1L);

        assertNotNull(found);
        assertEquals(1L, found.getId());
    }

    @Test
    void testGetHolidayById_NotFound_ThrowsResourceNotFoundException() {
        when(holidayRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> holidayService.getHolidayById(999L));
    }

    @Test
    void testUpdateHoliday_Success() {
        HolidayRequestDTO updateReq = new HolidayRequestDTO(LocalDate.of(2026, 12, 26), "Boxing Day", "Holiday");
        when(holidayRepository.findById(1L)).thenReturn(Optional.of(holiday));
        when(holidayRepository.existsByHolidayDate(updateReq.getHolidayDate())).thenReturn(false);
        when(holidayRepository.save(any(Holiday.class))).thenReturn(holiday);

        Holiday updated = holidayService.updateHoliday(1L, updateReq);

        assertNotNull(updated);
        assertEquals("Boxing Day", updated.getName());
        assertEquals(LocalDate.of(2026, 12, 26), updated.getHolidayDate());
    }

    @Test
    void testDeleteHoliday() {
        when(holidayRepository.findById(1L)).thenReturn(Optional.of(holiday));

        holidayService.deleteHoliday(1L);

        verify(holidayRepository, times(1)).delete(holiday);
    }

    @Test
    void testCountHolidaysBetween() {
        when(holidayRepository.countByHolidayDateBetween(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(2L);

        long count = holidayService.countHolidaysBetween(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31));

        assertEquals(2L, count);
    }
}
