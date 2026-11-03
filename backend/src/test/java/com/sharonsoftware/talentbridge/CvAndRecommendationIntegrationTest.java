package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.CvEntryRepository;
import com.sharonsoftware.talentbridge.repository.RecommendationLetterRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CvAndRecommendationIntegrationTest extends DatabaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private CvEntryRepository cvEntryRepository;

    @Autowired
    private RecommendationLetterRepository letterRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void clearData() {
        letterRepository.deleteAll();
        cvEntryRepository.deleteAll();
        studentProfileRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void studentCanManageOwnCvButCannotReadOrModifyAnotherStudentsEntry() throws Exception {
        TestData data = createTestData();
        MvcResult created = mockMvc.perform(post("/api/cv")
                        .header("Authorization", "Bearer " + data.studentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Engineer","organization":"Acme","description":"Built APIs","startDate":"2024-01-01","endDate":"2025-01-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Engineer"))
                .andReturn();
        JsonNode entry = objectMapper.readTree(created.getResponse().getContentAsString());
        String entryId = entry.get("id").asText();

        mockMvc.perform(put("/api/cv/{id}", entryId)
                        .header("Authorization", "Bearer " + data.otherStudentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Changed\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/cv/{id}", entryId)
                        .header("Authorization", "Bearer " + data.otherStudentToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/cv/{id}", entryId)
                        .header("Authorization", "Bearer " + data.otherStudentToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/cv/{id}", entryId)
                        .header("Authorization", "Bearer " + data.studentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Senior Engineer\",\"organization\":\"Acme\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Senior Engineer"));
        mockMvc.perform(get("/api/cv").header("Authorization", "Bearer " + data.studentToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Senior Engineer"));
        mockMvc.perform(delete("/api/cv/{id}", entryId)
                        .header("Authorization", "Bearer " + data.studentToken()))
                .andExpect(status().isNoContent());
    }

    @Test
    void mentorDraftIsHiddenUntilPublishedAndThenVisibleOnlyToItsStudent() throws Exception {
        TestData data = createTestData();
        MvcResult created = mockMvc.perform(post("/api/recommendation-letters")
                        .header("Authorization", "Bearer " + data.mentorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateLetterBody(data.profileId(), "A thoughtful mentor letter."))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        String letterId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/recommendation-letters/mine")
                        .header("Authorization", "Bearer " + data.studentToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(put("/api/recommendation-letters/{id}", letterId)
                        .header("Authorization", "Bearer " + data.mentorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Updated draft.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Updated draft."));
        mockMvc.perform(post("/api/recommendation-letters/{id}/publish", letterId)
                        .header("Authorization", "Bearer " + data.mentorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        mockMvc.perform(get("/api/recommendation-letters/mine")
                        .header("Authorization", "Bearer " + data.studentToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Updated draft."));
        mockMvc.perform(get("/api/recommendation-letters/{id}", letterId)
                        .header("Authorization", "Bearer " + data.otherStudentToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/recommendation-letters/{id}", letterId)
                        .header("Authorization", "Bearer " + data.mentorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"No longer editable\"}"))
                .andExpect(status().isConflict());
    }

    private TestData createTestData() {
        User student = saveUser("cv-student@example.com", Role.STUDENT);
        User otherStudent = saveUser("cv-other@example.com", Role.STUDENT);
        User mentor = saveUser("cv-mentor@example.com", Role.MENTOR);
        StudentProfile profile = createProfile(student);
        createProfile(otherStudent);
        return new TestData(
                jwtService.issueTokenPair(student).accessToken(),
                jwtService.issueTokenPair(otherStudent).accessToken(),
                jwtService.issueTokenPair(mentor).accessToken(),
                profile.getId());
    }

    private StudentProfile createProfile(User user) {
        StudentProfile profile = new StudentProfile();
        profile.setUser(user);
        profile.setStartDate(LocalDate.now());
        return studentProfileRepository.save(profile);
    }

    private User saveUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("CV");
        user.setLastName(role.name());
        user.setRole(role);
        return userRepository.save(user);
    }

    private record CreateLetterBody(java.util.UUID studentProfileId, String content) {
    }

    private record TestData(String studentToken, String otherStudentToken, String mentorToken, java.util.UUID profileId) {
    }
}