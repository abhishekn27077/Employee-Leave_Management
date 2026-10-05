package com.example.employeeleave.controller;

import com.example.employeeleave.dto.AuthResponseDTO;
import com.example.employeeleave.dto.LoginRequestDTO;
import com.example.employeeleave.dto.UserSummaryDTO;
import com.example.employeeleave.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        AuthResponseDTO response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserSummaryDTO> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        UserSummaryDTO user = authService.getCurrentUser(authHeader);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Collections.singletonMap("message", "Logged out successfully"));
    }
}
