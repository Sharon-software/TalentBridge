package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.service.SubmissionService;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;
    private final StudentProfileRepository studentProfileRepository;
    private final SubmissionRepository submissionRepository;

    public SubmissionController(
            SubmissionService submissionService,
            StudentProfileRepository studentProfileRepository,
            SubmissionRepository submissionRepository) {
        this.submissionService = submissionService;
        this.studentProfileRepository = studentProfileRepository;
        this.submissionRepository = submissionRepository;
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STUDENT')")
    public SubmissionResponse submit(
            @RequestParam UUID assignmentId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) throws IOException {
        return toResponse(submissionService.submit(assignmentId, user, file));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('STUDENT')")
    public List<SubmissionResponse> mySubmissions(@AuthenticationPrincipal User user) {
        UUID profileId = findStudentProfileId(user.getId());
        return submissionRepository.findAllByStudentProfileIdOrderBySubmittedAtDesc(profileId)
                .stream().map(SubmissionController::toResponse).toList();
    }

    @GetMapping("/me/punctuality")
    @PreAuthorize("hasRole('STUDENT')")
    public PunctualityResponse myPunctuality(@AuthenticationPrincipal User user) {
        return punctuality(findStudentProfileId(user.getId()));
    }

    @GetMapping("/students/punctuality")
    @PreAuthorize("hasAnyRole('COACH', 'ADMIN')")
    public PunctualityResponse studentPunctuality(@RequestParam UUID studentProfileId) {
        if (!studentProfileRepository.existsById(studentProfileId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found");
        }
        return punctuality(studentProfileId);
    }

    private UUID findStudentProfileId(UUID userId) {
        return studentProfileRepository.findByUserId(userId)
                .map(profile -> profile.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
    }

    private PunctualityResponse punctuality(UUID studentProfileId) {
        long total = submissionRepository.countByStudentProfileId(studentProfileId);
        long onTime = submissionRepository.countByStudentProfileIdAndStatus(studentProfileId, SubmissionStatus.ON_TIME);
        BigDecimal percentage = total == 0
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(onTime).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        return new PunctualityResponse(studentProfileId, total, onTime, percentage);
    }

    private static SubmissionResponse toResponse(Submission submission) {
        return new SubmissionResponse(
                submission.getId(),
                submission.getAssignment().getId(),
                submission.getOriginalFilename(),
                submission.getContentType(),
                submission.getFileSize(),
                submission.getSubmittedAt(),
                submission.getStatus());
    }

    public record SubmissionResponse(
            UUID id,
            UUID assignmentId,
            String filename,
            String contentType,
            Long fileSize,
            Instant submittedAt,
            SubmissionStatus status) {
    }

    public record PunctualityResponse(UUID studentProfileId, long totalSubmissions, long onTimeSubmissions, BigDecimal percentage) {
    }
}