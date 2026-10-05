package com.example.employeeleave.security;

import com.example.employeeleave.entity.UserAccount;
import com.example.employeeleave.entity.UserRole;
import com.example.employeeleave.exception.AccountDisabledException;
import com.example.employeeleave.exception.ForbiddenException;
import com.example.employeeleave.exception.UnauthorizedException;
import com.example.employeeleave.repository.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class SecurityInterceptor implements HandlerInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserAccountRepository userAccountRepository;

    public SecurityInterceptor(JwtTokenProvider jwtTokenProvider, UserAccountRepository userAccountRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        // Allow public authentication endpoints and error dispatch
        if (uri.startsWith("/api/auth/login") || uri.startsWith("/api/auth/logout") || uri.startsWith("/error")) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authentication token is required");
        }

        String token = authHeader.substring(7).trim();
        if (!jwtTokenProvider.validateToken(token)) {
            throw new UnauthorizedException("Invalid or expired session token");
        }

        String username = jwtTokenProvider.getUsernameFromToken(token);
        if (username == null) {
            throw new UnauthorizedException("Invalid token payload");
        }

        UserAccount user = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User account not found"));

        if (!user.isActive()) {
            throw new AccountDisabledException("Account is disabled. Please contact your system administrator.");
        }

        SecurityContext.setCurrentUser(user);

        // Enforce route-level administrative authorization
        enforceRouteAuthorization(uri, method, user.getRole());

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        SecurityContext.clear();
    }

    private void enforceRouteAuthorization(String uri, String method, UserRole role) {
        // Administrative Management Routes (HR_ADMIN only)
        boolean isDepartmentAdmin = uri.startsWith("/api/departments") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method));
        boolean isEmployeeAdmin = uri.startsWith("/api/employees") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method));
        boolean isPolicyAdmin = uri.startsWith("/api/leave-policies") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method));
        boolean isLeaveTypeAdmin = uri.startsWith("/api/leave-types") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method));
        boolean isHolidayAdmin = uri.startsWith("/api/holidays") && ("POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method));
        boolean isBalanceAdmin = uri.startsWith("/api/leave-balances") && "POST".equals(method);
        boolean isAdjustmentAdmin = uri.startsWith("/api/leave-adjustments") && "POST".equals(method);
        boolean isAuditAdmin = uri.startsWith("/api/audit-history");

        if (isDepartmentAdmin || isEmployeeAdmin || isPolicyAdmin || isLeaveTypeAdmin ||
                isHolidayAdmin || isBalanceAdmin || isAdjustmentAdmin || isAuditAdmin) {
            if (role != UserRole.HR_ADMIN) {
                throw new ForbiddenException("Access denied: HR_ADMIN role required for this administrative operation");
            }
        }

        // Workforce Dashboard (Manager or HR Admin)
        if (uri.startsWith("/api/dashboard") && role == UserRole.EMPLOYEE) {
            throw new ForbiddenException("Access denied: Workforce dashboard is restricted to Managers and HR Admins");
        }
    }
}
