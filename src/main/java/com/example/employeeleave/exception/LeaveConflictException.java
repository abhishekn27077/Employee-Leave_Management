package com.example.employeeleave.exception;

import com.example.employeeleave.dto.ConflictDetailDTO;

import java.util.Collections;
import java.util.List;

public class LeaveConflictException extends RuntimeException {

    private final List<ConflictDetailDTO> conflicts;

    public LeaveConflictException(String message) {
        super(message);
        this.conflicts = Collections.emptyList();
    }

    public LeaveConflictException(String message, List<ConflictDetailDTO> conflicts) {
        super(message);
        this.conflicts = conflicts != null ? conflicts : Collections.emptyList();
    }

    public List<ConflictDetailDTO> getConflicts() {
        return conflicts;
    }
}
