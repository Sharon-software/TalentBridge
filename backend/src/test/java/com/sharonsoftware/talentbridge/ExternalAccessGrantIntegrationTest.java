package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import com.sharonsoftware.talentbridge.storage.FileStorage;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.sharonsoftware.talentbridge.analysis.AnalysisScheduler;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExternalAccessGrantIntegrationTest extends DatabaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CohortRepository cohortRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ExternalAccessGrantRepository grantRepository;

    @Autowired
    private ScoreCardRepository scoreCardRepository;

    @Autowired
    private FileStorage fileStorage;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private AnalysisScheduler analysisScheduler;

    @BeforeEach
    void clearData() {
        grantRepository.deleteAll();
        scoreCardRepository.deleteAll();
        submissionRepository.deleteAll();
        assignmentRepository.deleteAll();
        studentProfileRepository.deleteAll();
        cohortRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void externalMentorCanReadOnlyTheSpecificallyGrantedSubmission() throws Exception {
        TestData data = createTestData();
        String grantBody = objectMapper.writeValueAsString(new GrantRequest(data.externalMentorId(), null));
        var grantResult = mockMvc.perform(post("/api/submissions/{id}/external-access-grants", data.firstSubmissionId())
                        .header("Authorization", "Bearer " + data.coachToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.revoked").value(false))
                .andExpect(jsonPath("$.externalMentorName").value("Test EXTERNAL_MENTOR"))
                .andReturn();
        JsonNode grant = objectMapper.readTree(grantResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/submissions/{id}/external-access-grants", data.firstSubmissionId())
                        .header("Authorization", "Bearer " + data.coachToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(grant.get("id").asText()));

        mockMvc.perform(get("/api/submissions/{id}/file", data.firstSubmissionId())
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isOk())
                .andExpect(content().string("first submission"));
        mockMvc.perform(get("/api/submissions/{id}/file", data.secondSubmissionId())
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/submissions/{id}/analysis", data.secondSubmissionId())
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/submissions/{id}/external-access-grants/{grantId}",
                                data.firstSubmissionId(), grant.get("id").asText())
                        .header("Authorization", "Bearer " + data.coachToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revoked").value(true));
        mockMvc.perform(get("/api/submissions/{id}/external-access-grants", data.firstSubmissionId())
                        .header("Authorization", "Bearer " + data.coachToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(get("/api/submissions/{id}/file", data.firstSubmissionId())
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void expiredGrantDoesNotAuthorizeExternalMentor() throws Exception {
        TestData data = createTestData();
        ExternalAccessGrant grant = new ExternalAccessGrant();
        grant.setAssignment(assignmentRepository.findById(data.assignmentId()).orElseThrow());
        grant.setSubmission(submissionRepository.findById(data.firstSubmissionId()).orElseThrow());
        grant.setExternalMentor(userRepository.findById(data.externalMentorId()).orElseThrow());
        grant.setExpiresAt(Instant.now().minusSeconds(1));
        grant.setRevoked(false);
        grantRepository.save(grant);

        mockMvc.perform(get("/api/submissions/{id}/file", data.firstSubmissionId())
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isForbidden());
    }

    private TestData createTestData() throws Exception {
        User coach = saveUser("coach@example.com", Role.COACH);
        User externalMentor = saveUser("external@example.com", Role.EXTERNAL_MENTOR);
        User student = saveUser("student@example.com", Role.STUDENT);
        StudentProfile profile = new StudentProfile();
        profile.setUser(student);
        profile.setStartDate(LocalDate.now());
        profile = studentProfileRepository.save(profile);
        Cohort cohort = new Cohort();
        cohort.setName("Grant cohort " + UUID.randomUUID());
        cohort = cohortRepository.save(cohort);
        Assignment assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle("Grant assignment");
        assignment.setDueAt(Instant.now().plusSeconds(3600));
        assignment = assignmentRepository.save(assignment);
        Assignment secondAssignment = new Assignment();
        secondAssignment.setCohort(cohort);
        secondAssignment.setTitle("Second grant assignment");
        secondAssignment.setDueAt(Instant.now().plusSeconds(3600));
        secondAssignment = assignmentRepository.save(secondAssignment);
        Submission first = saveSubmission(profile, assignment, "first.txt", "first submission");
        Submission second = saveSubmission(profile, secondAssignment, "second.txt", "second submission");
        return new TestData(
                jwtService.issueTokenPair(coach).accessToken(),
                jwtService.issueTokenPair(externalMentor).accessToken(),
                externalMentor.getId(),
                assignment.getId(),
                first.getId(),
                second.getId());
    }

    private Submission saveSubmission(StudentProfile profile, Assignment assignment, String filename, String contents)
            throws Exception {
        FileStorage.StoredFile stored = fileStorage.store(new MockMultipartFile(
                "file", filename, "text/plain", contents.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        Submission submission = new Submission();
        submission.setAssignment(assignment);
        submission.setStudentProfile(profile);
        submission.setSubmittedAt(Instant.now());
        submission.setStatus(SubmissionStatus.ON_TIME);
        submission.setStorageKey(stored.storageKey());
        submission.setOriginalFilename(stored.originalFilename());
        submission.setContentType(stored.contentType());
        submission.setFileSize(stored.size());
        return submissionRepository.save(submission);
    }

    private User saveUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("Test");
        user.setLastName(role.name());
        user.setRole(role);
        return userRepository.save(user);
    }

    private record GrantRequest(UUID externalMentorId, Instant expiresAt) {
    }

    private record TestData(
            String coachToken,
            String externalMentorToken,
            UUID externalMentorId,
            UUID assignmentId,
            UUID firstSubmissionId,
            UUID secondSubmissionId) {
    }
}