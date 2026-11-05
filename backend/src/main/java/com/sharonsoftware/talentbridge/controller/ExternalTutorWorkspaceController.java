package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.ExternalTutorAssignment;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.ExternalTutorAssignmentRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/external-tutor")
@PreAuthorize("hasRole('EXTERNAL_TUTOR')")
public class ExternalTutorWorkspaceController {

    private final ExternalTutorAssignmentRepository tutorAssignmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreCardRepository scoreCardRepository;

    public ExternalTutorWorkspaceController(
            ExternalTutorAssignmentRepository tutorAssignmentRepository,
            StudentProfileRepository studentProfileRepository,
            AssignmentRepository assignmentRepository,
            SubmissionRepository submissionRepository,
            ScoreCardRepository scoreCardRepository) {
        this.tutorAssignmentRepository = tutorAssignmentRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.scoreCardRepository = scoreCardRepository;
    }

    @GetMapping("/cohorts")
    public List<TutorCohort> assignedCohorts(@AuthenticationPrincipal User tutor) {
        return tutorAssignmentRepository.findAllByExternalTutorIdOrderByCohortNameAsc(tutor.getId()).stream()
                .map(assignment -> toCohort(assignment))
                .toList();
    }

    @GetMapping("/cohorts/{cohortId}/submissions")
    public List<TutorSubmission> submissions(
            @PathVariable UUID cohortId,
            @AuthenticationPrincipal User tutor) {
        requireAssignedCohort(cohortId, tutor.getId());
        return submissionRepository.findAllByAssignment_Cohort_Id(cohortId).stream()
                .map(this::toSubmission)
                .sorted((left, right) -> right.submittedAt().compareTo(left.submittedAt()))
                .toList();
    }

    private void requireAssignedCohort(UUID cohortId, UUID tutorId) {
        if (!tutorAssignmentRepository.existsByCohortIdAndExternalTutorId(cohortId, tutorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This cohort is not assigned to the external tutor");
        }
    }

    private TutorCohort toCohort(ExternalTutorAssignment tutorAssignment) {
        var cohort = tutorAssignment.getCohort();
        return new TutorCohort(
                cohort.getId(), cohort.getName(), cohort.getStartDate(), cohort.getEndDate(),
                studentProfileRepository.countByCohortId(cohort.getId()),
                assignmentRepository.countByCohortId(cohort.getId()), tutorAssignment.getAssignedAt());
    }

    private TutorSubmission toSubmission(Submission submission) {
        var student = submission.getStudentProfile().getUser();
        var scoreCard = scoreCardRepository.findBySubmissionId(submission.getId()).orElse(null);
        return new TutorSubmission(
                submission.getId(), submission.getAssignment().getId(), submission.getAssignment().getTitle(),
                student.getId(), student.getFirstName(), student.getLastName(), submission.getOriginalFilename(),
                submission.getSubmittedAt(), submission.getStatus(),
                scoreCard == null ? null : scoreCard.getAnalysisStatus(), scoreCard == null ? null : scoreCard.getScore());
    }

    public record TutorCohort(
            UUID id,
            String name,
            LocalDate startDate,
            LocalDate endDate,
            long studentCount,
            long assignmentCount,
            Instant assignedAt) {
    }

    public record TutorSubmission(
            UUID id,
            UUID assignmentId,
            String assignmentTitle,
            UUID studentId,
            String studentFirstName,
            String studentLastName,
            String filename,
            Instant submittedAt,
            SubmissionStatus status,
            AnalysisStatus analysisStatus,
            BigDecimal score) {
    }
}