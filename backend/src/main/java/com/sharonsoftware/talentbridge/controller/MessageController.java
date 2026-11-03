package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.messaging.CreateMessageThreadRequest;
import com.sharonsoftware.talentbridge.messaging.MessageService;
import com.sharonsoftware.talentbridge.messaging.SendMessageRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
@PreAuthorize("hasAnyRole('STUDENT', 'EXTERNAL_MENTOR')")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping("/threads")
    public MessageService.ThreadSummary createThread(
            @Valid @RequestBody CreateMessageThreadRequest request,
            @AuthenticationPrincipal User user) {
        return messageService.createThread(request, user.getId());
    }

    @GetMapping("/threads")
    public List<MessageService.ThreadSummary> listThreads(@AuthenticationPrincipal User user) {
        return messageService.listThreads(user.getId());
    }

    @GetMapping("/threads/{threadId}")
    public MessageService.ThreadMessages readThread(
            @PathVariable UUID threadId,
            @AuthenticationPrincipal User user) {
        return messageService.readThread(threadId, user.getId());
    }

    @PostMapping("/threads/{threadId}/messages")
    public MessageService.MessageView sendMessage(
            @PathVariable UUID threadId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User user) {
        return messageService.sendMessage(threadId, user.getId(), request.body());
    }

    @GetMapping("/unread-count")
    public MessageService.UnreadCount unreadCount(@AuthenticationPrincipal User user) {
        return messageService.unreadCount(user.getId());
    }
}