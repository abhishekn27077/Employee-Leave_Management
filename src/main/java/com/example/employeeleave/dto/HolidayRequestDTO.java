package com.example.employeeleave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class HolidayRequestDTO {

    @NotNull(message = "Holiday date is required")
    private LocalDate holidayDate;

    @NotBlank(message = "Holiday name is required")
    private String name;

    private String description;

    public HolidayRequestDTO() {
    }

    public HolidayRequestDTO(LocalDate holidayDate, String name, String description) {
        this.holidayDate = holidayDate;
        this.name = name;
        this.description = description;
    }

    public LocalDate getHolidayDate() {
        return holidayDate;
    }

    public void setHolidayDate(LocalDate holidayDate) {
        this.holidayDate = holidayDate;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
