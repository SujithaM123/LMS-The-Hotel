package com.lms.platform.dto;

import com.lms.platform.entity.User;
import lombok.Getter;

import java.time.Instant;

@Getter
public class UserSummaryResponse {
    private final Long id;
    private final String name;
    private final String email;
    private final String role;
    private final Instant createdAt;

    public UserSummaryResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole().getName().name();
        this.createdAt = user.getCreatedAt();
    }
}
