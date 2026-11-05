package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/submissions/{submissionId}/external-access-grants")
public class ExternalAccessGrantController {

    private final ExternalAccessGrantRepository grantRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;

    public ExternalAccessGrantController(
            ExternalAccessGrantRepository grantRepository,
            SubmissionRepository submissionRepository,
            UserRepository userRepository) {
        this.grantRepository = grantRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COACH', 'MENTOR')")
    public List<GrantResponse> activeGrants(@PathVariable UUID submissionId) {
        if (!submissionRepository.existsById(submissionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found");
        }
        return grantRepository.findActiveBySubmissionId(submissionId, Instant.now()).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('COACH', 'MENTOR')")
    public GrantResponse grant(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GrantRequest request) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));
        User externalMentor = userRepository.findById(request.externalMentorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "External mentor not found"));
        if (externalMentor.getRole() != Role.EXTERNAL_MENTOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not an external mentor");
        }

        ExternalAccessGrant grant = new ExternalAccessGrant();
        grant.setAssignment(submission.getAssignment());
        grant.setSubmission(submission);
        grant.setExternalMentor(externalMentor);
        grant.setExpiresAt(request.expiresAt());
        grant.setRevoked(false);
        return toResponse(grantRepository.save(grant));
    }

    @DeleteMapping("/{grantId}")
    @PreAuthorize("hasAnyRole('COACH', 'MENTOR')")
    public GrantResponse revoke(@PathVariable UUID submissionId, @PathVariable UUID grantId) {
        ExternalAccessGrant grant = grantRepository.findByIdAndSubmissionId(grantId, submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grant not found"));
        grant.setRevoked(true);
        return toResponse(grantRepository.save(grant));
    }

    private GrantResponse toResponse(ExternalAccessGrant grant) {
        User externalMentor = userRepository.findById(grant.getExternalMentor().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "External mentor not found"));
        return new GrantResponse(
                grant.getId(), grant.getSubmission().getId(), grant.getExternalMentor().getId(),
                externalMentor.getFirstName() + " " + externalMentor.getLastName(),
                grant.getExpiresAt(), grant.isRevoked());
    }

    public record GrantRequest(@NotNull UUID externalMentorId, @Future Instant expiresAt) {
    }

    public record GrantResponse(
            UUID id,
            UUID submissionId,
            UUID externalMentorId,
            String externalMentorName,
            Instant expiresAt,
            boolean revoked) {
    }
}