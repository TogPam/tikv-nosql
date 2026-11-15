package com.shoes.infrastructure.tikv;

public class ConcurrencyConflictException extends RuntimeException {
    public ConcurrencyConflictException(String message, Throwable cause) {
        super(message, cause);
    }

    public ConcurrencyConflictException(String message) {
        super(message);
    }
}
