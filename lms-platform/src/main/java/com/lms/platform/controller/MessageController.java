package com.lms.platform.controller;

import com.lms.platform.dto.MessageRequest;
import com.lms.platform.dto.MessageResponse;
import com.lms.platform.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<MessageResponse> sendMessage(@Valid @RequestBody MessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messageService.sendMessage(request));
    }

    @GetMapping
    public ResponseEntity<List<MessageResponse>> listMessages() {
        return ResponseEntity.ok(messageService.listForCurrentUser());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MessageResponse> getMessage(@PathVariable Long id) {
        return ResponseEntity.ok(messageService.getMessage(id));
    }
}
