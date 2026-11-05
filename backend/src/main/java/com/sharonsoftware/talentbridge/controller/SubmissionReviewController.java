package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import com.sharonsoftware.talentbridge.domain.ExternalTutorAssignment;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionReview;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.ExternalTutorAssignmentRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionReviewRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/submissions/{submissionId}/review")
@PreAuthorize("hasAnyRole('EXTERNAL_TUTOR', 'EXTERNAL_MENTOR')")
public class SubmissionReviewController {

    private final SubmissionRepository submissionRepository;
    private final ExternalAccessGrantRepository grantRepository;
    private final ExternalTutorAssignmentRepository tutorAssignmentRepository;
    private final SubmissionReviewRepository reviewRepository;

    public SubmissionReviewController(
            SubmissionRepository submissionRepository,
            ExternalAccessGrantRepository grantRepository,
            ExternalTutorAssignmentRepository tutorAssignmentRepository,
            SubmissionReviewRepository reviewRepository) {
        this.submissionRepository = submissionRepository;
        this.grantRepository = grantRepository;
        this.tutorAssignmentRepository = tutorAssignmentRepository;
        this.reviewRepository = reviewRepository;
    }

    @GetMapping
    public ReviewResponse getReview(
            @PathVariable UUID submissionId,
            @AuthenticationPrincipal User user) {
        requireAccess(submissionId, user);
        return reviewRepository.findBySubmissionIdAndAuthorId(submissionId, user.getId())
                .map(review -> toResponse(review, user))
                .orElse(null);
    }

    @PutMapping
    public ReviewResponse saveReview(
            @PathVariable UUID submissionId,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal User user) {
        Submission submission = requireAccess(submissionId, user);
        SubmissionReview review = reviewRepository.findBySubmissionIdAndAuthorId(submissionId, user.getId())
                .orElseGet(() -> {
                    SubmissionReview newReview = new SubmissionReview();
                    newReview.setSubmission(submission);
                    newReview.setAuthor(user);
                    return newReview;
                });
        review.setRating(request.rating());
        review.setComments(request.comments().trim());
        return toResponse(reviewRepository.save(review), user);
    }

    private Submission requireAccess(UUID submissionId, User user) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));
        if (user.getRole() == Role.EXTERNAL_MENTOR
                && grantRepository.hasActiveGrant(submissionId, user.getId(), Instant.now())) {
            return submission;
        }
        if (user.getRole() == Role.EXTERNAL_TUTOR) {
            UUID cohortId = submissionRepository.findCohortIdById(submissionId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));
            if (tutorAssignmentRepository.existsByCohortIdAndExternalTutorId(cohortId, user.getId())) {
                return submission;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Submission is not shared with this account");
    }

    private static ReviewResponse toResponse(SubmissionReview review, User user) {
        return new ReviewResponse(
                review.getId(), review.getSubmission().getId(), user.getId(),
                user.getFirstName() + " " + user.getLastName(), review.getRating(), review.getComments(),
                review.getCreatedAt(), review.getUpdatedAt());
    }

    public record ReviewRequest(
            @Min(1) @Max(5) int rating,
            @NotBlank @Size(max = 10000) String comments) {
    }

    public record ReviewResponse(
            UUID id,
            UUID submissionId,
            UUID authorId,
            String authorName,
            int rating,
            String comments,
            Instant createdAt,
            Instant updatedAt) {
    }
}