package com.lms.platform.dto;

import com.lms.platform.entity.Message;
import lombok.Getter;

import java.time.Instant;

@Getter
public class MessageResponse {
    private final Long id;
    private final Long senderId;
    private final String senderName;
    private final Long recipientId;
    private final String recipientName;
    private final Long courseId;
    private final String courseTitle;
    private final String content;
    private final Instant sentAt;

    public MessageResponse(Message message) {
        this.id = message.getId();
        this.senderId = message.getSender().getId();
        this.senderName = message.getSender().getName();
        this.recipientId = message.getRecipient().getId();
        this.recipientName = message.getRecipient().getName();
        this.courseId = message.getCourse().getId();
        this.courseTitle = message.getCourse().getTitle();
        this.content = message.getContent();
        this.sentAt = message.getSentAt();
    }
}
