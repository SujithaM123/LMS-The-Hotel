package com.lms.platform.controller;

import com.lms.platform.dto.MessageRequest;
import com.lms.platform.dto.WsErrorResponse;
import com.lms.platform.exception.ForbiddenActionException;
import com.lms.platform.exception.ResourceNotFoundException;
import com.lms.platform.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

/**
 * WebSocket counterpart of POST /api/messages. Deliberately trivial: it calls the exact same
 * MessageService.sendMessage(...) the REST controller calls, so REST and WebSocket can never
 * develop different authorization rules. senderId is never read from the payload - MessageRequest
 * has no such field, and the sender is whoever StompAuthChannelInterceptor authenticated at
 * CONNECT.
 *
 * <p>The role check here is manual rather than {@code @PreAuthorize}: clientInboundChannel
 * dispatches to @MessageMapping handlers on a pooled executor thread that is not the same thread
 * StompAuthChannelInterceptor ran preSend() on, so a SecurityContextHolder value set there does
 * not survive to here. The {@code Authentication} method parameter is unaffected by that - Spring
 * resolves it straight from the message's own headers, not the ThreadLocal - so it is always
 * correct; we then seed SecurityContextHolder from it before calling into MessageService (whose
 * CurrentUserProvider does read SecurityContextHolder), on this same thread, which is safe.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class StompMessageController {

    private static final String ROLE_INSTRUCTOR = "ROLE_INSTRUCTOR";

    private final MessageService messageService;

    @MessageMapping("/messages")
    public void sendMessage(@Valid @Payload MessageRequest request, Authentication authentication) {
        if (authentication == null
                || authentication.getAuthorities().stream().noneMatch(a -> ROLE_INSTRUCTOR.equals(a.getAuthority()))) {
            throw new ForbiddenActionException("Only instructors may send this message");
        }

        log.info("WS SEND /app/messages from {} (courseId={}, studentId={})",
                authentication.getName(), request.getCourseId(), request.getStudentId());

        SecurityContextHolder.getContext().setAuthentication(authentication);
        try {
            messageService.sendMessage(request);
            // Real-time delivery to the recipient happens inside MessageService itself (shared
            // with REST); nothing further to do here on success.
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @MessageExceptionHandler({ForbiddenActionException.class, ResourceNotFoundException.class,
            AccessDeniedException.class, AuthorizationDeniedException.class,
            MethodArgumentNotValidException.class})
    @SendToUser("/queue/errors")
    public WsErrorResponse handleSendError(Exception ex, Authentication authentication) {
        String who = authentication != null ? authentication.getName() : "unknown";
        log.warn("WS SEND /app/messages rejected for {}: {}", who, ex.getClass().getSimpleName());
        return new WsErrorResponse("/app/messages", "Message not sent: request was rejected");
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/errors")
    public WsErrorResponse handleUnexpectedError(Exception ex) {
        log.error("Unexpected WS error", ex);
        return new WsErrorResponse("/app/messages", "Message not sent: an unexpected error occurred");
    }
}
