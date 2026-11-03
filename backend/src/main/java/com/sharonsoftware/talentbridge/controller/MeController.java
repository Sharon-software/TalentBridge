package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.User;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        return new MeResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getRole().name());
    }

    public record MeResponse(UUID id, String email, String firstName, String lastName, String role) {
    }
}