package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
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
class AdminControllerIntegrationTest extends DatabaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CohortRepository cohortRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void clearData() {
        cohortRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void adminCanCreateUsersAssignRolesAndManageCohorts() throws Exception {
        String adminToken = createToken("admin@example.com", Role.ADMIN);

        MvcResult userResult = mockMvc.perform(post("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"mentor@example.com","password":"mentor-password","firstName":"Mina","lastName":"Mentor","role":"STUDENT"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        JsonNode user = objectMapper.readTree(userResult.getResponse().getContentAsString());

        mockMvc.perform(patch("/api/admin/users/{id}/role", user.get("id").asText())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"MENTOR\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MENTOR"));

        MvcResult cohortResult = mockMvc.perform(post("/api/admin/cohorts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Spring 2026","startDate":"2026-03-01","endDate":"2026-09-01"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Spring 2026"))
                .andReturn();
        String cohortId = objectMapper.readTree(cohortResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/admin/cohorts").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Spring 2026"));
        mockMvc.perform(put("/api/admin/cohorts/{id}", cohortId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Autumn 2026\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-12-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Autumn 2026"));
        mockMvc.perform(delete("/api/admin/cohorts/{id}", cohortId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void adminRoutesRejectUnauthenticatedAndNonAdminUsers() throws Exception {
        mockMvc.perform(get("/api/admin/cohorts"))
                .andExpect(status().isUnauthorized());

        String studentToken = createToken("student@example.com", Role.STUDENT);
        mockMvc.perform(get("/api/admin/cohorts").header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    private String createToken(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("Test");
        user.setLastName(role.name());
        user.setRole(role);
        return jwtService.issueTokenPair(userRepository.save(user)).accessToken();
    }
}