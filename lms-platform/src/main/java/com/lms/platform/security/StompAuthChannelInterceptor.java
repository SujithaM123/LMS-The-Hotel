package com.lms.platform.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authenticates STOMP CONNECT frames using the same JWT/UserDetailsService the REST API uses
 * (no second auth implementation), and locks down which destinations a connected client may
 * SUBSCRIBE or SEND to - this is the ONLY place private-destination access is enforced at the
 * transport level; business/ownership rules still live in the services (MessageService etc.)
 * and are reached via the SecurityContext this interceptor populates for every frame.
 *
 * <p>Authentication is tracked per STOMP session id in {@link #sessionAuthentications} rather
 * than relying on {@code accessor.getUser()} being echoed onto later frames: Spring's
 * StompSubProtocolHandler snapshots a CONNECT frame's user into its own internal map before this
 * interceptor's preSend even runs, so a plain {@code accessor.setUser(...)} call here is too
 * late for that built-in propagation. Keeping our own session registry sidesteps that entirely
 * and gives us an explicit place to clean up on DISCONNECT.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Set<String> ALLOWED_SUBSCRIBE_DESTINATIONS =
            Set.of("/user/queue/notifications", "/user/queue/messages", "/user/queue/errors");

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    private final Map<String, Authentication> sessionAuthentications = new ConcurrentHashMap<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        String sessionId = accessor.getSessionId();

        switch (accessor.getCommand()) {
            case CONNECT -> handleConnect(accessor, sessionId);
            case SUBSCRIBE -> {
                Authentication auth = requireSession(sessionId);
                accessor.setUser(auth);
                SecurityContextHolder.getContext().setAuthentication(auth);
                guardSubscribe(accessor, auth);
            }
            case SEND -> {
                Authentication auth = requireSession(sessionId);
                accessor.setUser(auth);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
            case DISCONNECT -> {
                Authentication removed = sessionAuthentications.remove(sessionId);
                log.info("STOMP session {} disconnected (user={})", sessionId,
                        removed != null ? removed.getName() : "unknown");
            }
            default -> {
                Authentication auth = sessionAuthentications.get(sessionId);
                if (auth != null) {
                    accessor.setUser(auth);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }

        return message;
    }

    @Override
    public void afterSendCompletion(Message<?> message, MessageChannel channel, boolean sent, Exception ex) {
        // Inbound channel threads are pooled and reused across sessions/users - never let one
        // user's authentication leak into the next message processed on the same thread.
        SecurityContextHolder.clearContext();
    }

    private void handleConnect(StompHeaderAccessor accessor, String sessionId) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            log.warn("STOMP CONNECT rejected: missing Authorization header (session={})", sessionId);
            throw new MessagingException("Authentication required");
        }

        String token = header.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            log.warn("STOMP CONNECT rejected: invalid or expired token (session={})", sessionId);
            throw new MessagingException("Invalid or expired token");
        }

        String email = jwtUtil.extractEmail(token);
        UserPrincipal principal;
        try {
            principal = (UserPrincipal) userDetailsService.loadUserByUsername(email);
        } catch (Exception e) {
            log.warn("STOMP CONNECT rejected: user no longer exists (session={})", sessionId);
            throw new MessagingException("Authentication required");
        }

        Authentication authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        sessionAuthentications.put(sessionId, authentication);
        accessor.setUser(authentication);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        log.info("STOMP CONNECT accepted (session={}, user={})", sessionId, email);
    }

    /** Every non-CONNECT frame must belong to a session that already passed CONNECT auth. */
    private Authentication requireSession(String sessionId) {
        Authentication auth = sessionAuthentications.get(sessionId);
        if (auth == null) {
            log.warn("Rejected frame from unauthenticated session {}", sessionId);
            throw new MessagingException("Authentication required");
        }
        return auth;
    }

    private void guardSubscribe(StompHeaderAccessor accessor, Authentication auth) {
        String destination = accessor.getDestination();
        if (destination == null || !ALLOWED_SUBSCRIBE_DESTINATIONS.contains(destination)) {
            log.warn("Rejected SUBSCRIBE to disallowed destination '{}' (session={}, user={})",
                    destination, accessor.getSessionId(), auth.getName());
            throw new MessagingException("Subscription denied");
        }
        // Destinations are fixed, unparameterized private queues (/user/queue/messages, etc.) -
        // Spring resolves "/user" against the authenticated Principal of THIS session, so there
        // is no client-suppliable user id here for another user's queue to be requested at all.
    }
}
