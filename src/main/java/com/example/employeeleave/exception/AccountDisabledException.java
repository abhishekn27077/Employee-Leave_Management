package com.example.employeeleave.exception;

public class AccountDisabledException extends RuntimeException {

    public AccountDisabledException(String message) {
        super(message);
    }
}
