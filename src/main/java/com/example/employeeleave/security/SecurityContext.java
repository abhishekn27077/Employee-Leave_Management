package com.example.employeeleave.security;

import com.example.employeeleave.entity.UserAccount;

public final class SecurityContext {

    private static final ThreadLocal<UserAccount> CURRENT_USER = new ThreadLocal<>();

    private SecurityContext() {
    }

    public static void setCurrentUser(UserAccount user) {
        CURRENT_USER.set(user);
    }

    public static UserAccount getCurrentUser() {
        return CURRENT_USER.get();
    }

    public static void clear() {
        CURRENT_USER.remove();
    }
}
