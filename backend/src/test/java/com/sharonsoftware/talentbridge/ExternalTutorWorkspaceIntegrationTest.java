package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.ExternalTutorAssignment;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.ExternalTutorAssignmentRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionReviewRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExternalTutorWorkspaceIntegrationTest extends DatabaseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CohortRepository cohortRepository;
    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private StudentProfileRepository studentProfileRepository;
    @Autowired private SubmissionRepository submissionRepository;
    @Autowired private ScoreCardRepository scoreCardRepository;
    @Autowired private ExternalTutorAssignmentRepository tutorAssignmentRepository;
    @Autowired private SubmissionReviewRepository reviewRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User tutor;
    private User otherTutor;
    private StudentProfile studentProfile;
    private Cohort cohort;
    private Assignment assignment;
    private Submission submission;

    @BeforeEach
    void setUpWorkspace() {
        reviewRepository.deleteAll();
        scoreCardRepository.deleteAll();
        submissionRepository.deleteAll();
        tutorAssignmentRepository.deleteAll();
        assignmentRepository.deleteAll();
        studentProfileRepository.deleteAll();
        cohortRepository.deleteAll();
        userRepository.deleteAll();

        tutor = saveUser("external-tutor@example.com", Role.EXTERNAL_TUTOR);
        otherTutor = saveUser("other-tutor@example.com", Role.EXTERNAL_TUTOR);
        User student = saveUser("tutor-student@example.com", Role.STUDENT);
        cohort = new Cohort();
        cohort.setName("Tutor cohort " + UUID.randomUUID());
        cohort = cohortRepository.save(cohort);

        studentProfile = new StudentProfile();
        studentProfile.setUser(student);
        studentProfile.setCohort(cohort);
        studentProfile.setStartDate(LocalDate.now().minusMonths(1));
        studentProfile = studentProfileRepository.save(studentProfile);

        assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle("Tutor assignment");
        assignment.setDueAt(Instant.now().plusSeconds(3600));
        assignment = assignmentRepository.save(assignment);

        submission = new Submission();
        submission.setAssignment(assignment);
        submission.setStudentProfile(studentProfile);
        submission.setSubmittedAt(Instant.now());
        submission.setStatus(SubmissionStatus.ON_TIME);
        submission = submissionRepository.save(submission);

        ScoreCard scoreCard = new ScoreCard();
        scoreCard.setSubmission(submission);
        scoreCard.setAnalysisStatus(AnalysisStatus.COMPLETED);
        scoreCard.setScore(new BigDecimal("84.00"));
        scoreCardRepository.save(scoreCard);

        ExternalTutorAssignment tutorAssignment = new ExternalTutorAssignment();
        tutorAssignment.setCohort(cohort);
        tutorAssignment.setExternalTutor(tutor);
        tutorAssignmentRepository.save(tutorAssignment);
    }

    @Test
    void assignedTutorSeesCohortSubmissionsAndCanSaveFeedback() throws Exception {
        mockMvc.perform(get("/api/external-tutor/cohorts")
                        .header("Authorization", bearer(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(cohort.getId().toString()))
                .andExpect(jsonPath("$[0].studentCount").value(1));

        mockMvc.perform(get("/api/external-tutor/cohorts/{cohortId}/submissions", cohort.getId())
                        .header("Authorization", bearer(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentFirstName").value("Workspace"))
                .andExpect(jsonPath("$[0].assignmentTitle").value("Tutor assignment"));

        mockMvc.perform(get("/api/submissions/{submissionId}/analysis", submission.getId())
                        .header("Authorization", bearer(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(84.0));

        mockMvc.perform(put("/api/submissions/{submissionId}/review", submission.getId())
                        .header("Authorization", bearer(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"comments\":\"Clear approach; add more test coverage.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4))
                .andExpect(jsonPath("$.comments").value("Clear approach; add more test coverage."));
    }

    @Test
    void tutorCannotReadOrReviewUnassignedCohortSubmissions() throws Exception {
        mockMvc.perform(get("/api/external-tutor/cohorts/{cohortId}/submissions", cohort.getId())
                        .header("Authorization", bearer(otherTutor)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/submissions/{submissionId}/analysis", submission.getId())
                        .header("Authorization", bearer(otherTutor)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/submissions/{submissionId}/review", submission.getId())
                        .header("Authorization", bearer(otherTutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comments\":\"Not assigned\"}"))
                .andExpect(status().isForbidden());
    }

    private User saveUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("Workspace");
        user.setLastName(role.name());
        user.setRole(role);
        return userRepository.save(user);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.issueTokenPair(user).accessToken();
    }
}