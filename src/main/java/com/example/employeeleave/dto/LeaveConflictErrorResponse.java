package com.example.employeeleave.dto;

import java.util.ArrayList;
import java.util.List;

public class LeaveConflictErrorResponse extends ErrorResponse {

    private List<ConflictDetailDTO> conflicts = new ArrayList<>();

    public LeaveConflictErrorResponse() {
        super();
    }

    public LeaveConflictErrorResponse(int status, String error, String message, String path, List<ConflictDetailDTO> conflicts) {
        super(status, error, message, path);
        this.conflicts = conflicts != null ? conflicts : new ArrayList<>();
    }

    public List<ConflictDetailDTO> getConflicts() {
        return conflicts;
    }

    public void setConflicts(List<ConflictDetailDTO> conflicts) {
        this.conflicts = conflicts != null ? conflicts : new ArrayList<>();
    }
}
