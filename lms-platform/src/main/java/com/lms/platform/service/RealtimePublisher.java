package com.lms.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Pushes an already-persisted entity to a single user's private WebSocket queue. The database
 * write always happens first (in the calling service, inside its own transaction); this only
 * fires after that transaction actually commits, so a real-time push is never sent for data that
 * ends up rolled back. If the target user is offline, convertAndSendToUser is a silent no-op -
 * the row is already durable and reachable via the normal REST endpoints when they return.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendToUser(String email, String destination, Object payload) {
        Runnable send = () -> {
            try {
                messagingTemplate.convertAndSendToUser(email, destination, payload);
            } catch (Exception e) {
                log.warn("Realtime push to {} {} failed: {}", destination, email, e.getMessage());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }
}
