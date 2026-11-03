package com.sharonsoftware.talentbridge.messaging;

import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String THREAD_QUEUE_PREFIX = "/user/queue/threads/";
    private static final String APP_THREAD_PREFIX = "/app/threads/";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final MessageService messageService;

    public StompAuthChannelInterceptor(
            JwtService jwtService,
            UserRepository userRepository,
            MessageService messageService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.messageService = messageService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        if (accessor.getCommand() == StompCommand.CONNECT) {
            authenticate(accessor);
        } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            authorizeSubscription(accessor);
        } else if (accessor.getCommand() == StompCommand.SEND) {
            authorizeSend(accessor);
        }
        return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new BadCredentialsException("A bearer token is required for STOMP connections");
        }
        try {
            Claims claims = jwtService.parse(authorization.substring(7));
            if (!jwtService.isAccessToken(claims)) {
                throw new BadCredentialsException("An access token is required for STOMP connections");
            }
            UUID userId = UUID.fromString(claims.getSubject());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new BadCredentialsException("Unknown STOMP user"));
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    userId.toString(),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
        } catch (JwtException | IllegalArgumentException exception) {
            throw new BadCredentialsException("Invalid STOMP access token", exception);
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        UUID threadId = extractThreadId(accessor.getDestination(), THREAD_QUEUE_PREFIX, "");
        assertThreadAccess(threadId, authenticatedUserId(accessor));
    }

    private void authorizeSend(StompHeaderAccessor accessor) {
        UUID threadId = extractThreadId(accessor.getDestination(), APP_THREAD_PREFIX, "/messages");
        assertThreadAccess(threadId, authenticatedUserId(accessor));
    }

    private void assertThreadAccess(UUID threadId, UUID userId) {
        try {
            messageService.assertCanAccessThread(threadId, userId);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == 403) {
                throw new AccessDeniedException(exception.getReason(), exception);
            }
            throw exception;
        }
    }

    private static UUID extractThreadId(String destination, String prefix, String suffix) {
        if (destination == null || !destination.startsWith(prefix) || !destination.endsWith(suffix)) {
            throw new AccessDeniedException("STOMP destination is not allowed");
        }
        String value = destination.substring(prefix.length(), destination.length() - suffix.length());
        if (value.isBlank() || value.contains("/")) {
            throw new AccessDeniedException("STOMP destination is not allowed");
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new AccessDeniedException("STOMP destination is not allowed", exception);
        }
    }

    private static UUID authenticatedUserId(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new BadCredentialsException("STOMP connection is not authenticated");
        }
        try {
            return UUID.fromString(accessor.getUser().getName());
        } catch (IllegalArgumentException exception) {
            throw new BadCredentialsException("Invalid STOMP user", exception);
        }
    }
}