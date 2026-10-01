package com.example.employeeleave.dto;

public class ConflictDetailDTO {
    private String type;
    private String message;
    private boolean blocking = true;

    public ConflictDetailDTO() {
    }

    public ConflictDetailDTO(String type, String message, boolean blocking) {
        this.type = type;
        this.message = message;
        this.blocking = blocking;
    }

    public ConflictDetailDTO(ConflictType type, String message, boolean blocking) {
        this(type != null ? type.name() : "POLICY_VIOLATION", message, blocking);
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isBlocking() {
        return blocking;
    }

    public void setBlocking(boolean blocking) {
        this.blocking = blocking;
    }
}
