package com.example.employeeleave.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

@Entity
@Table(name = "holidays", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"holiday_date"})
})
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Holiday date is required")
    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate holidayDate;

    @NotBlank(message = "Holiday name is required")
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    public Holiday() {
    }

    public Holiday(LocalDate holidayDate, String name, String description) {
        this.holidayDate = holidayDate;
        this.name = name;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
