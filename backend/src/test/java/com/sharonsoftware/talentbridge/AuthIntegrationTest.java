package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import java.time.LocalDate;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest extends DatabaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

        @Autowired
        private ExternalAccessGrantRepository externalAccessGrantRepository;

        @Autowired
        private ScoreCardRepository scoreCardRepository;

        @Autowired
        private SubmissionRepository submissionRepository;

        @Autowired
        private AssignmentRepository assignmentRepository;

        @Autowired
        private StudentProfileRepository studentProfileRepository;

        @Autowired
        private CohortRepository cohortRepository;

    @BeforeEach
    void clearUsers() {
                externalAccessGrantRepository.deleteAll();
                scoreCardRepository.deleteAll();
                submissionRepository.deleteAll();
                assignmentRepository.deleteAll();
                studentProfileRepository.deleteAll();
                cohortRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void registerAndLoginReturnUsableTokens() throws Exception {
        String registration = """
                {"email":"student@example.com","password":"correct-horse","firstName":"Sam","lastName":"Student"}
                """;
        MvcResult registrationResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registration))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String refreshToken = objectMapper.readTree(registrationResult.getResponse().getContentAsString())
                .get("refreshToken").asText();
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("refreshToken", refreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@example.com","password":"correct-horse"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andReturn();

        JsonNode tokenResponse = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        StudentProfile profile = studentProfileRepository.findByUserId(
                userRepository.findByEmail("student@example.com").orElseThrow().getId()).orElseThrow();
        profile.setStartDate(LocalDate.of(2026, 1, 15));
        studentProfileRepository.save(profile);
        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + tokenResponse.get("accessToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("student@example.com"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.startDate").value("2026-01-15"));
        mockMvc.perform(get("/api/submissions/mine")
                        .header("Authorization", "Bearer " + tokenResponse.get("accessToken").asText()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/submissions/me/punctuality")
                        .header("Authorization", "Bearer " + tokenResponse.get("accessToken").asText()))
                .andExpect(status().isOk());
    }

    @Test
    void invalidLoginReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"missing@example.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentCanReadAndUpdateTheirProfile() throws Exception {
        String registrationResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"profile-student@example.com","password":"correct-horse","firstName":"Pat","lastName":"Profile"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(registrationResult).get("accessToken").asText();

        mockMvc.perform(put("/api/student/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"bio":"ICT student focused on cloud development.","photoUrl":"https://example.com/profile.jpg"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("ICT student focused on cloud development."))
                .andExpect(jsonPath("$.photoUrl").value("https://example.com/profile.jpg"));

        mockMvc.perform(get("/api/student/profile").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Pat"))
                .andExpect(jsonPath("$.bio").value("ICT student focused on cloud development."));
    }

    @Test
    void protectedEndpointReturnsUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void frontendEntryAndLoginRoutesArePublic() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(result -> assertNotEquals(401, result.getResponse().getStatus()));
        mockMvc.perform(get("/login"))
                .andExpect(forwardedUrl("/index.html"));
        mockMvc.perform(get("/assets/app.js"))
                .andExpect(result -> assertNotEquals(401, result.getResponse().getStatus()));
    }

    @Test
    void studentCannotAccessAdminEndpoint() throws Exception {
        String registration = """
                {"email":"student@example.com","password":"correct-horse","firstName":"Sam","lastName":"Student"}
                """;
        MvcResult registrationResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registration))
                .andExpect(status().isCreated())
                .andReturn();
        String accessToken = objectMapper.readTree(registrationResult.getResponse().getContentAsString())
                .get("accessToken").asText();

        mockMvc.perform(get("/api/admin/reports").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isForbidden());
    }
}