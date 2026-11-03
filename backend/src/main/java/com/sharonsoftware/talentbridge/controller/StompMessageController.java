package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.messaging.MessageService;
import com.sharonsoftware.talentbridge.messaging.SendMessageRequest;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class StompMessageController {

    private final MessageService messageService;

    public StompMessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/threads/{threadId}/messages")
    public void sendMessage(
            @DestinationVariable UUID threadId,
            @Valid @Payload SendMessageRequest request,
            Principal principal) {
        messageService.sendMessage(threadId, UUID.fromString(principal.getName()), request.body());
    }
}