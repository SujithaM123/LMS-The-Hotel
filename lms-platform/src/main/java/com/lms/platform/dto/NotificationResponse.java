package com.lms.platform.dto;

import com.lms.platform.entity.Notification;
import lombok.Getter;

import java.time.Instant;

@Getter
public class NotificationResponse {
    private final Long id;
    private final String content;
    private final String type;
    private final boolean read;
    private final Instant createdAt;

    public NotificationResponse(Notification notification) {
        this.id = notification.getId();
        this.content = notification.getContent();
        this.type = notification.getType().name();
        this.read = notification.isRead();
        this.createdAt = notification.getCreatedAt();
    }
}
