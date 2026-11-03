package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    private final AssignmentRepository assignmentRepository;
    private final CohortRepository cohortRepository;

    public AssignmentController(AssignmentRepository assignmentRepository, CohortRepository cohortRepository) {
        this.assignmentRepository = assignmentRepository;
        this.cohortRepository = cohortRepository;
    }

    @GetMapping
    public List<AssignmentResponse> listAssignments() {
        return assignmentRepository.findAll().stream().map(AssignmentController::toResponse).toList();
    }

    @GetMapping("/{id}")
    public AssignmentResponse getAssignment(@PathVariable UUID id) {
        return toResponse(assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found")));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('COACH')")
    public AssignmentResponse createAssignment(@Valid @RequestBody CreateAssignmentRequest request) {
        var cohort = cohortRepository.findById(request.cohortId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cohort not found"));
        Assignment assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle(request.title().trim());
        assignment.setDescription(request.description());
        assignment.setDueAt(request.dueAt());
        return toResponse(assignmentRepository.save(assignment));
    }

    private static AssignmentResponse toResponse(Assignment assignment) {
        return new AssignmentResponse(
                assignment.getId(),
                assignment.getCohort().getId(),
                assignment.getTitle(),
                assignment.getDescription(),
                assignment.getDueAt());
    }

    public record CreateAssignmentRequest(
            @NotNull UUID cohortId,
            @NotBlank @Size(max = 200) String title,
            String description,
            @NotNull Instant dueAt) {
    }

    public record AssignmentResponse(UUID id, UUID cohortId, String title, String description, Instant dueAt) {
    }
}