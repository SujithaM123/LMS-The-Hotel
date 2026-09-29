package com.lms.platform.dto;

import lombok.Getter;

import java.time.Instant;

/**
 * Sanitized error payload delivered to a single user's /user/queue/errors after a rejected
 * WebSocket SEND. Never carries stack traces, tokens, or the rejected payload's contents.
 */
@Getter
public class WsErrorResponse {
    private final Instant timestamp = Instant.now();
    private final String destination;
    private final String message;

    public WsErrorResponse(String destination, String message) {
        this.destination = destination;
        this.message = message;
    }
}
