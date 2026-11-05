package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces")
@PreAuthorize("hasAnyRole('COACH', 'MENTOR')")
public class CoachMentorWorkspaceController {

    private final CohortRepository cohortRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ScoreCardRepository scoreCardRepository;
    private final UserRepository userRepository;

    public CoachMentorWorkspaceController(
            CohortRepository cohortRepository,
            StudentProfileRepository studentProfileRepository,
            AssignmentRepository assignmentRepository,
            SubmissionRepository submissionRepository,
            ScoreCardRepository scoreCardRepository,
            UserRepository userRepository) {
        this.cohortRepository = cohortRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.scoreCardRepository = scoreCardRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/cohorts")
    public List<CohortSummary> cohorts() {
        return cohortRepository.findAll().stream()
                .sorted((left, right) -> left.getName().compareToIgnoreCase(right.getName()))
                .map(cohort -> new CohortSummary(
                        cohort.getId(), cohort.getName(), cohort.getStartDate(), cohort.getEndDate(),
                        studentProfileRepository.countByCohortId(cohort.getId()),
                        assignmentRepository.countByCohortId(cohort.getId())))
                .toList();
    }

    @GetMapping("/cohorts/{cohortId}/students")
    public List<StudentRosterEntry> students(@PathVariable UUID cohortId) {
        Cohort cohort = findCohort(cohortId);
        List<Assignment> assignments = assignmentRepository.findAllByCohortIdOrderByDueAtAsc(cohortId);
        List<StudentProfile> profiles = studentProfileRepository.findAllByCohortId(cohortId);
        Map<UUID, List<Submission>> submissionsByStudent = submissionRepository.findAllByAssignment_Cohort_Id(cohortId)
                .stream().collect(Collectors.groupingBy(submission -> submission.getStudentProfile().getId()));
        Instant now = Instant.now();

        return profiles.stream()
                .map(profile -> toRosterEntry(
                        profile,
                        assignments,
                        submissionsByStudent.getOrDefault(profile.getId(), List.of()),
                        now))
                .sorted((left, right) -> {
                    int byLastName = left.lastName().compareToIgnoreCase(right.lastName());
                    return byLastName != 0 ? byLastName : left.firstName().compareToIgnoreCase(right.firstName());
                })
                .toList();
    }

    @GetMapping("/students/{studentProfileId}")
    public StudentWorkspaceDetail studentDetail(@PathVariable UUID studentProfileId) {
        StudentProfile profile = studentProfileRepository.findById(studentProfileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
        List<Submission> submissions = submissionRepository.findAllByStudentProfileIdOrderBySubmittedAtDesc(studentProfileId);
        List<ScoreCard> scoreCards = scoreCardRepository.findAllBySubmissionStudentProfileIdOrderByIdAsc(studentProfileId);
        Map<UUID, ScoreCard> scoreCardsBySubmission = scoreCards.stream()
                .collect(Collectors.toMap(card -> card.getSubmission().getId(), Function.identity()));

        List<SubmissionDetail> submissionDetails = submissions.stream()
                .map(submission -> {
                    ScoreCard scoreCard = scoreCardsBySubmission.get(submission.getId());
                    return new SubmissionDetail(
                            submission.getId(), submission.getAssignment().getId(), submission.getAssignment().getTitle(),
                            submission.getOriginalFilename(), submission.getAssignment().getDueAt(), submission.getSubmittedAt(), submission.getStatus(),
                            scoreCard == null ? null : scoreCard.getAnalysisStatus(),
                            scoreCard == null ? null : scoreCard.getScore());
                })
                .toList();
        long total = submissions.size();
        long onTime = submissions.stream().filter(item -> item.getStatus() == SubmissionStatus.ON_TIME).count();
        BigDecimal percentage = total == 0
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(onTime).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        List<ScoreCardDetail> scoreCardDetails = scoreCards.stream()
                .map(card -> new ScoreCardDetail(
                        card.getSubmission().getId(), card.getAnalysisStatus(), card.getScore(),
                        card.getQualityScore(), card.getCorrectnessScore(), card.getOriginalityScore(),
                        card.getCommunicationScore(), card.getStrengths(), card.getWeaknesses(), card.getSuggestions()))
                .toList();

        StudentRosterEntry summary;
        if (profile.getCohort() == null) {
            summary = toRosterEntry(profile, List.of(), submissions, Instant.now());
        } else {
            summary = toRosterEntry(
                    profile,
                    assignmentRepository.findAllByCohortIdOrderByDueAtAsc(profile.getCohort().getId()),
                    submissions,
                    Instant.now());
        }
        return new StudentWorkspaceDetail(summary, submissionDetails, scoreCardDetails, new PunctualityDetail(total, onTime, percentage));
    }

    @GetMapping("/external-mentors")
    public List<ExternalMentorSummary> externalMentors() {
        return userRepository.findAllByRole(Role.EXTERNAL_MENTOR).stream()
                .sorted((left, right) -> {
                    int byLastName = left.getLastName().compareToIgnoreCase(right.getLastName());
                    return byLastName != 0 ? byLastName : left.getFirstName().compareToIgnoreCase(right.getFirstName());
                })
                .map(user -> new ExternalMentorSummary(
                        user.getId(), user.getFirstName(), user.getLastName(), user.getEmail()))
                .toList();
    }

    private Cohort findCohort(UUID cohortId) {
        return cohortRepository.findById(cohortId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cohort not found"));
    }

    private StudentRosterEntry toRosterEntry(
            StudentProfile profile,
            List<Assignment> cohortAssignments,
            List<Submission> studentSubmissions,
            Instant now) {
        User user = userRepository.findById(profile.getUser().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));
        long onTime = studentSubmissions.stream().filter(item -> item.getStatus() == SubmissionStatus.ON_TIME).count();
        BigDecimal percentage = studentSubmissions.isEmpty()
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(onTime).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(studentSubmissions.size()), 2, RoundingMode.HALF_UP);
        Set<UUID> submittedAssignmentIds = studentSubmissions.stream()
                .map(item -> item.getAssignment().getId())
                .collect(Collectors.toSet());
        boolean fallingBehind = cohortAssignments.stream()
                .filter(assignment -> assignment.getDueAt() != null && assignment.getDueAt().isBefore(now))
                .anyMatch(assignment -> !submittedAssignmentIds.contains(assignment.getId()));
        return new StudentRosterEntry(
                profile.getId(), user.getFirstName(), user.getLastName(), profile.getStartDate(),
                profile.getOverallScore(), studentSubmissions.size(), percentage, fallingBehind);
    }

    public record CohortSummary(UUID id, String name, LocalDate startDate, LocalDate endDate, long studentCount, long assignmentCount) {
    }

    public record StudentRosterEntry(
            UUID studentProfileId,
            String firstName,
            String lastName,
            LocalDate startDate,
            BigDecimal overallScore,
            long totalSubmissions,
            BigDecimal onTimePercentage,
            boolean fallingBehind) {
    }

    public record StudentWorkspaceDetail(
            StudentRosterEntry student,
            List<SubmissionDetail> submissions,
            List<ScoreCardDetail> scoreCards,
            PunctualityDetail punctuality) {
    }

    public record SubmissionDetail(
            UUID id,
            UUID assignmentId,
            String assignmentTitle,
            String filename,
            Instant dueAt,
            Instant submittedAt,
            SubmissionStatus status,
            AnalysisStatus analysisStatus,
            BigDecimal score) {
    }

    public record ScoreCardDetail(
            UUID submissionId,
            AnalysisStatus status,
            BigDecimal score,
            Integer quality,
            Integer correctness,
            Integer originality,
            Integer communication,
            List<String> strengths,
            List<String> weaknesses,
            List<String> suggestions) {
    }

    public record PunctualityDetail(long totalSubmissions, long onTimeSubmissions, BigDecimal percentage) {
    }

    public record ExternalMentorSummary(UUID id, String firstName, String lastName, String email) {
    }
}