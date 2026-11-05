package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/student/profile")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProfileController {

    private final StudentProfileRepository studentProfileRepository;

    public StudentProfileController(StudentProfileRepository studentProfileRepository) {
        this.studentProfileRepository = studentProfileRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public StudentProfileResponse getProfile(@AuthenticationPrincipal User user) {
        return toResponse(findProfile(user));
    }

    @PutMapping
    @Transactional
    public StudentProfileResponse updateProfile(
            @Valid @RequestBody StudentProfileRequest request,
            @AuthenticationPrincipal User user) {
        StudentProfile profile = findProfile(user);
        profile.setBio(request.bio() == null ? null : request.bio().trim());
        profile.setPhotoUrl(request.photoUrl() == null || request.photoUrl().isBlank() ? null : request.photoUrl().trim());
        return toResponse(studentProfileRepository.save(profile));
    }

    private StudentProfile findProfile(User user) {
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
    }

    private static StudentProfileResponse toResponse(StudentProfile profile) {
        User user = profile.getUser();
        return new StudentProfileResponse(
                profile.getId(), user.getFirstName(), user.getLastName(), user.getEmail(), profile.getBio(),
                profile.getPhotoUrl(), profile.getStartDate(), profile.getOverallScore(),
                profile.getCohort() == null ? null : profile.getCohort().getName());
    }

    public record StudentProfileRequest(
            @Size(max = 2000) String bio,
            @Pattern(regexp = "(https?://.*)?") @Size(max = 1000) String photoUrl) {
    }

    public record StudentProfileResponse(
            UUID studentProfileId,
            String firstName,
            String lastName,
            String email,
            String bio,
            String photoUrl,
            LocalDate startDate,
            BigDecimal overallScore,
            String cohortName) {
    }
}