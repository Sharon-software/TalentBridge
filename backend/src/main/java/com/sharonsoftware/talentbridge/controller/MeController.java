package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    private final StudentProfileRepository studentProfileRepository;

    public MeController(StudentProfileRepository studentProfileRepository) {
        this.studentProfileRepository = studentProfileRepository;
    }

    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        LocalDate startDate = user.getRole() == Role.STUDENT
                ? studentProfileRepository.findByUserId(user.getId()).map(StudentProfile::getStartDate).orElse(null)
                : null;
        return new MeResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getRole().name(), startDate);
    }

    public record MeResponse(UUID id, String email, String firstName, String lastName, String role, LocalDate startDate) {
    }
}