package com.lms.platform.dto;

import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
public class ApiError {
    private final Instant timestamp = Instant.now();
    private final int status;
    private final String error;
    private final String message;
    private final String path;
    private List<String> details;

    public ApiError(int status, String error, String message, String path) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }

    public ApiError withDetails(List<String> details) {
        this.details = details;
        return this;
    }
}
