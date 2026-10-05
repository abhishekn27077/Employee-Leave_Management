package com.example.employeeleave.dto;

public class AuthResponseDTO {

    private String token;
    private String tokenType = "Bearer";
    private boolean authenticated = true;
    private UserSummaryDTO user;
    private String message;

    public AuthResponseDTO() {
    }

    public AuthResponseDTO(String token, UserSummaryDTO user, String message) {
        this.token = token;
        this.tokenType = "Bearer";
        this.authenticated = true;
        this.user = user;
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public UserSummaryDTO getUser() {
        return user;
    }

    public void setUser(UserSummaryDTO user) {
        this.user = user;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
