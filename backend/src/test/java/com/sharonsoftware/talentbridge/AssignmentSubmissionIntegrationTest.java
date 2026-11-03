package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AssignmentSubmissionIntegrationTest {

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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void clearData() {
        submissionRepository.deleteAll();
        assignmentRepository.deleteAll();
        studentProfileRepository.deleteAll();
        cohortRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void coachCanCreateDeadlineAssignmentAndStudentCannot() throws Exception {
        String coachToken = createUser("coach@example.com", Role.COACH);
        String studentToken = createUser("student@example.com", Role.STUDENT);
        Cohort cohort = new Cohort();
        cohort.setName("Winter 2026");
        cohort = cohortRepository.save(cohort);
        String request = objectMapper.writeValueAsString(new AssignmentRequest(
                cohort.getId(), "Portfolio", "Submit a portfolio", Instant.now().plusSeconds(3600)));

        MvcResult result = mockMvc.perform(post("/api/assignments")
                        .header("Authorization", "Bearer " + coachToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dueAt").isNotEmpty())
                .andReturn();
        JsonNode assignment = objectMapper.readTree(result.getResponse().getContentAsString());

        mockMvc.perform(post("/api/assignments")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/assignments/{id}", assignment.get("id").asText())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());
    }

    @Test
    void studentUploadsAreClassifiedAndPunctualityIsCalculated() throws Exception {
        User student = saveUser("student@example.com", Role.STUDENT);
        String studentToken = jwtService.issueTokenPair(student).accessToken();
        StudentProfile profile = new StudentProfile();
        profile.setUser(student);
        profile.setStartDate(LocalDate.now());
        profile = studentProfileRepository.save(profile);
        Cohort cohort = new Cohort();
        cohort.setName("Winter 2026");
        cohort = cohortRepository.save(cohort);
        Assignment onTimeAssignment = saveAssignment(cohort, "Future", Instant.now().plusSeconds(3600));
        Assignment lateAssignment = saveAssignment(cohort, "Past", Instant.now().minusSeconds(3600));

        upload(studentToken, onTimeAssignment.getId(), "on-time.txt")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ON_TIME"))
                .andExpect(jsonPath("$.filename").value("on-time.txt"));
        upload(studentToken, lateAssignment.getId(), "late.txt")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("LATE"));

        mockMvc.perform(get("/api/submissions/me/punctuality")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentProfileId").value(profile.getId().toString()))
                .andExpect(jsonPath("$.totalSubmissions").value(2))
                .andExpect(jsonPath("$.onTimeSubmissions").value(1))
                .andExpect(jsonPath("$.percentage").value(50.0));
    }

    private org.springframework.test.web.servlet.ResultActions upload(String token, java.util.UUID assignmentId, String filename)
            throws Exception {
        return mockMvc.perform(multipart("/api/submissions")
                .file(new MockMultipartFile("file", filename, "text/plain", "work".getBytes()))
                .param("assignmentId", assignmentId.toString())
                .header("Authorization", "Bearer " + token));
    }

    private Assignment saveAssignment(Cohort cohort, String title, Instant dueAt) {
        Assignment assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle(title);
        assignment.setDueAt(dueAt);
        return assignmentRepository.save(assignment);
    }

    private String createUser(String email, Role role) {
        return jwtService.issueTokenPair(saveUser(email, role)).accessToken();
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

    private record AssignmentRequest(java.util.UUID cohortId, String title, String description, Instant dueAt) {
    }
}