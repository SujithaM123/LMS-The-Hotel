package com.lms.platform.service;

import com.lms.platform.dto.NotificationResponse;
import com.lms.platform.entity.Notification;
import com.lms.platform.entity.NotificationType;
import com.lms.platform.entity.User;
import com.lms.platform.exception.ResourceNotFoundException;
import com.lms.platform.repository.NotificationRepository;
import com.lms.platform.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String NOTIFICATIONS_QUEUE = "/queue/notifications";

    private final NotificationRepository notificationRepository;
    private final CurrentUserProvider currentUserProvider;
    private final RealtimePublisher realtimePublisher;

    /**
     * Creates and persists a notification for the given user, then pushes it to that user's
     * live /user/queue/notifications subscription (once the enclosing transaction commits). The
     * database write is what matters: if the user isn't connected, the row is already saved and
     * shows up via GET /api/notifications whenever they next check.
     */
    public void notify(User user, String content, NotificationType type) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setContent(content);
        notification.setType(type);
        notificationRepository.save(notification);

        realtimePublisher.sendToUser(user.getEmail(), NOTIFICATIONS_QUEUE, new NotificationResponse(notification));
    }

    public List<NotificationResponse> listForCurrentUser() {
        Long userId = currentUserProvider.getPrincipal().getId();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::new)
                .toList();
    }

    public NotificationResponse markRead(Long notificationId) {
        Long userId = currentUserProvider.getPrincipal().getId();
        Notification notification = notificationRepository.findById(notificationId)
                // Same 404 whether the notification doesn't exist or belongs to someone else,
                // so ownership can't be probed by ID.
                .filter(n -> n.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        notification.setRead(true);
        notificationRepository.save(notification);
        return new NotificationResponse(notification);
    }
}
