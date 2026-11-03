package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.HireRequest;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.HireRequestRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/hire-requests")
@PreAuthorize("hasAnyRole('RECRUITER', 'MENTOR')")
public class HireRequestController {

    private final HireRequestRepository hireRequestRepository;
    private final StudentProfileRepository studentProfileRepository;

    public HireRequestController(
            HireRequestRepository hireRequestRepository,
            StudentProfileRepository studentProfileRepository) {
        this.hireRequestRepository = hireRequestRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HireRequestResponse create(
            @Valid @RequestBody CreateHireRequest request,
            @AuthenticationPrincipal User requester) {
        var profile = studentProfileRepository.findById(request.studentProfileId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
        if (profile.getStartDate().isAfter(java.time.LocalDate.now().minusMonths(6))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Eligible student not found");
        }
        HireRequest hireRequest = new HireRequest();
        hireRequest.setStudentProfile(profile);
        hireRequest.setRequestedBy(requester);
        hireRequest.setCompanyName(request.companyName().trim());
        hireRequest.setContactEmail(request.contactEmail());
        hireRequest.setMessage(request.message());
        return toResponse(hireRequestRepository.save(hireRequest));
    }

    @GetMapping
    public List<HireRequestResponse> listMine(@AuthenticationPrincipal User requester) {
        return hireRequestRepository.findAllByRequestedByIdOrderByRequestedAtDesc(requester.getId())
                .stream().map(HireRequestController::toResponse).toList();
    }

    @GetMapping("/{requestId}")
    public HireRequestResponse getMine(@PathVariable UUID requestId, @AuthenticationPrincipal User requester) {
        HireRequest hireRequest = hireRequestRepository.findById(requestId)
                .filter(item -> item.getRequestedBy() != null && item.getRequestedBy().getId().equals(requester.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hire request not found"));
        return toResponse(hireRequest);
    }

    private static HireRequestResponse toResponse(HireRequest request) {
        return new HireRequestResponse(
                request.getId(), request.getStudentProfile().getId(), request.getCompanyName(),
                request.getContactEmail(), request.getMessage(), request.getStatus(), request.getRequestedAt());
    }

    public record CreateHireRequest(
            @NotNull UUID studentProfileId,
            @NotBlank @Size(max = 200) String companyName,
            @Email @Size(max = 320) String contactEmail,
            @Size(max = 4000) String message) {
    }

    public record HireRequestResponse(
            UUID id,
            UUID studentProfileId,
            String companyName,
            String contactEmail,
            String message,
            HireRequest.Status status,
            Instant requestedAt) {
    }
}