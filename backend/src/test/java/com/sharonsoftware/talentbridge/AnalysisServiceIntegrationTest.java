package com.sharonsoftware.talentbridge;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.analysis.AnalysisResult;
import com.sharonsoftware.talentbridge.analysis.ClaudeApiClient;
import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnalysisServiceIntegrationTest extends DatabaseIntegrationTest {

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
    private ScoreCardRepository scoreCardRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private ClaudeApiClient claudeApiClient;

    @BeforeEach
    void clearData() {
        scoreCardRepository.deleteAll();
        submissionRepository.deleteAll();
        assignmentRepository.deleteAll();
        studentProfileRepository.deleteAll();
        cohortRepository.deleteAll();
        userRepository.deleteAll();
        when(claudeApiClient.analyze(anyString())).thenReturn(new AnalysisResult(
                new AnalysisResult.Scores(80, 90, 70, 100),
                List.of("Clear structure"),
                List.of("Limited evidence"),
                List.of("Add supporting examples")));
    }

    @Test
    void asynchronouslyPersistsRubricAndRecomputesWeightedOverallScore() throws Exception {
        TestSubmission testSubmission = createStudentSubmission();
        MvcResult result = upload(testSubmission);
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        java.util.UUID submissionId = java.util.UUID.fromString(response.get("id").asText());

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            ScoreCard scoreCard = scoreCardRepository.findBySubmissionId(submissionId).orElseThrow();
            assertEquals(AnalysisStatus.COMPLETED, scoreCard.getAnalysisStatus());
            assertEquals(new BigDecimal("85.00"), scoreCard.getScore());
            assertEquals(List.of("Clear structure"), scoreCard.getStrengths());
        });
        StudentProfile updatedProfile = studentProfileRepository.findById(testSubmission.profileId()).orElseThrow();
        assertEquals(new BigDecimal("88.00"), updatedProfile.getOverallScore());
        verify(claudeApiClient, times(1)).analyze(org.mockito.ArgumentMatchers.contains("submitted work sample"));
    }

    @Test
    void retriesClaudeFailuresAndPersistsFailedStatus() throws Exception {
        doThrow(new IllegalStateException("simulated API outage"))
                .when(claudeApiClient).analyze(anyString());
        TestSubmission testSubmission = createStudentSubmission();
        MvcResult result = upload(testSubmission);
        java.util.UUID submissionId = java.util.UUID.fromString(
                objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            ScoreCard scoreCard = scoreCardRepository.findBySubmissionId(submissionId).orElseThrow();
            assertEquals(AnalysisStatus.FAILED, scoreCard.getAnalysisStatus());
        });
        verify(claudeApiClient, times(3)).analyze(anyString());
    }

    @Test
    void reportsMissingClaudeApiKeyWithoutRetrying() throws Exception {
        doThrow(new IllegalStateException("ANTHROPIC_API_KEY is not configured"))
                .when(claudeApiClient).analyze(anyString());
        TestSubmission testSubmission = createStudentSubmission();
        MvcResult result = upload(testSubmission);
        java.util.UUID submissionId = java.util.UUID.fromString(
                objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            ScoreCard scoreCard = scoreCardRepository.findBySubmissionId(submissionId).orElseThrow();
            assertEquals(AnalysisStatus.FAILED, scoreCard.getAnalysisStatus());
            assertEquals("AI analysis is unavailable. Configure ANTHROPIC_API_KEY to enable it.", scoreCard.getErrorMessage());
        });
        verify(claudeApiClient, times(1)).analyze(anyString());
    }

    private MvcResult upload(TestSubmission testSubmission) throws Exception {
        return mockMvc.perform(multipart("/api/submissions")
                        .file(new MockMultipartFile(
                                "file", "work.txt", "text/plain", "submitted work sample".getBytes()))
                        .param("assignmentId", testSubmission.assignmentId().toString())
                        .header("Authorization", "Bearer " + testSubmission.accessToken()))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private TestSubmission createStudentSubmission() {
        User user = new User();
        user.setEmail("analysis-student@example.com");
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("Analysis");
        user.setLastName("Student");
        user.setRole(Role.STUDENT);
        user = userRepository.save(user);
        StudentProfile profile = new StudentProfile();
        profile.setUser(user);
        profile.setStartDate(LocalDate.now());
        profile = studentProfileRepository.save(profile);
        Cohort cohort = new Cohort();
        cohort.setName("Analysis Cohort");
        cohort = cohortRepository.save(cohort);
        Assignment assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle("Analysis assignment");
        assignment.setDueAt(Instant.now().plusSeconds(3600));
        assignment = assignmentRepository.save(assignment);
        String accessToken = jwtService.issueTokenPair(user).accessToken();
        return new TestSubmission(accessToken, assignment.getId(), profile.getId());
    }

    private record TestSubmission(String accessToken, java.util.UUID assignmentId, java.util.UUID profileId) {
    }
}