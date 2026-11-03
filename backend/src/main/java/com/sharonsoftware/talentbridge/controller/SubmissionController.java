package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
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
import org.springframework.web.bind.annotation.PathVariable;
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
    private final ScoreCardRepository scoreCardRepository;

    public SubmissionController(
            SubmissionService submissionService,
            StudentProfileRepository studentProfileRepository,
            SubmissionRepository submissionRepository,
            ScoreCardRepository scoreCardRepository) {
        this.submissionService = submissionService;
        this.studentProfileRepository = studentProfileRepository;
        this.submissionRepository = submissionRepository;
        this.scoreCardRepository = scoreCardRepository;
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
            .stream().map(this::toResponse).toList();
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

    @GetMapping("/{submissionId}/analysis")
    @PreAuthorize("hasAnyRole('STUDENT', 'COACH', 'ADMIN')")
    public AnalysisResponse analysis(@PathVariable UUID submissionId, @AuthenticationPrincipal User user) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));
        if (user.getRole() == Role.STUDENT) {
            UUID profileId = findStudentProfileId(user.getId());
            if (!profileId.equals(submission.getStudentProfile().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot view another student's analysis");
            }
        }
        ScoreCard scoreCard = scoreCardRepository.findBySubmissionId(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis not found"));
        return new AnalysisResponse(
                scoreCard.getAnalysisStatus(), scoreCard.getScore(), scoreCard.getQualityScore(),
                scoreCard.getCorrectnessScore(), scoreCard.getOriginalityScore(), scoreCard.getCommunicationScore(),
                scoreCard.getStrengths(), scoreCard.getWeaknesses(), scoreCard.getSuggestions(), scoreCard.getErrorMessage());
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
        BigDecimal overallScore = studentProfileRepository.findById(studentProfileId)
            .map(StudentProfile::getOverallScore)
            .orElse(null);
        return new PunctualityResponse(studentProfileId, total, onTime, percentage, overallScore);
    }

    private SubmissionResponse toResponse(Submission submission) {
        AnalysisStatus analysisStatus = scoreCardRepository.findBySubmissionId(submission.getId())
                .map(ScoreCard::getAnalysisStatus)
                .orElse(null);
        return new SubmissionResponse(
                submission.getId(),
                submission.getAssignment().getId(),
                submission.getOriginalFilename(),
                submission.getContentType(),
                submission.getFileSize(),
                submission.getSubmittedAt(),
                submission.getStatus(),
                analysisStatus);
    }

    public record SubmissionResponse(
            UUID id,
            UUID assignmentId,
            String filename,
            String contentType,
            Long fileSize,
            Instant submittedAt,
                SubmissionStatus status,
                AnalysisStatus analysisStatus) {
    }

            public record PunctualityResponse(
                UUID studentProfileId,
                long totalSubmissions,
                long onTimeSubmissions,
                BigDecimal percentage,
                BigDecimal overallScore) {
            }

            public record AnalysisResponse(
                AnalysisStatus status,
                BigDecimal score,
                Integer quality,
                Integer correctness,
                Integer originality,
                Integer communication,
                List<String> strengths,
                List<String> weaknesses,
                List<String> suggestions,
                String errorMessage) {
    }
}