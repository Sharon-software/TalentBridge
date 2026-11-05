package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/external-mentor")
@PreAuthorize("hasRole('EXTERNAL_MENTOR')")
public class ExternalMentorWorkspaceController {

    private final ExternalAccessGrantRepository grantRepository;
    private final ScoreCardRepository scoreCardRepository;

    public ExternalMentorWorkspaceController(
            ExternalAccessGrantRepository grantRepository,
            ScoreCardRepository scoreCardRepository) {
        this.grantRepository = grantRepository;
        this.scoreCardRepository = scoreCardRepository;
    }

    @GetMapping("/submissions")
    public List<GrantedSubmission> activeSubmissions(@AuthenticationPrincipal User mentor) {
        return grantRepository.findActiveByExternalMentorId(mentor.getId(), Instant.now()).stream()
                .map(this::toGrantedSubmission)
                .toList();
    }

    private GrantedSubmission toGrantedSubmission(ExternalAccessGrant grant) {
        var submission = grant.getSubmission();
        var student = submission.getStudentProfile().getUser();
        var scoreCard = scoreCardRepository.findBySubmissionId(submission.getId()).orElse(null);
        return new GrantedSubmission(
                submission.getId(), submission.getAssignment().getId(), submission.getAssignment().getTitle(),
                student.getId(), student.getFirstName(), student.getLastName(), submission.getOriginalFilename(),
                submission.getSubmittedAt(), submission.getStatus(), grant.getExpiresAt(),
                scoreCard == null ? null : scoreCard.getAnalysisStatus(), scoreCard == null ? null : scoreCard.getScore());
    }

    public record GrantedSubmission(
            UUID submissionId,
            UUID assignmentId,
            String assignmentTitle,
            UUID studentId,
            String studentFirstName,
            String studentLastName,
            String filename,
            Instant submittedAt,
            SubmissionStatus status,
            Instant expiresAt,
            AnalysisStatus analysisStatus,
            BigDecimal score) {
    }
}