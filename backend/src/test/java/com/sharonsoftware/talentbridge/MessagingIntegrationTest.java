package com.sharonsoftware.talentbridge;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.analysis.AnalysisScheduler;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.messaging.StompAuthChannelInterceptor;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.MessageRepository;
import com.sharonsoftware.talentbridge.repository.MessageThreadRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MessagingIntegrationTest extends DatabaseIntegrationTest {

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
    private MessageThreadRepository threadRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ScoreCardRepository scoreCardRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @MockitoBean
    private AnalysisScheduler analysisScheduler;

    @BeforeEach
    void clearData() {
        messageRepository.deleteAll();
        threadRepository.deleteAll();
        grantRepository.deleteAll();
        scoreCardRepository.deleteAll();
        submissionRepository.deleteAll();
        assignmentRepository.deleteAll();
        studentProfileRepository.deleteAll();
        cohortRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void participantsCanMessageAndUnreadCountsUpdateWhenThreadIsRead() throws Exception {
        TestData data = createTestData();
        String threadId = createThread(data, data.studentToken());

        mockMvc.perform(post("/api/messages/threads/{id}/messages", threadId)
                        .header("Authorization", "Bearer " + data.studentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"Hello mentor\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value("Hello mentor"));
        mockMvc.perform(get("/api/messages/unread-count")
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));

        mockMvc.perform(get("/api/messages/threads/{id}", threadId)
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].body").value("Hello mentor"));
        mockMvc.perform(get("/api/messages/unread-count")
                        .header("Authorization", "Bearer " + data.externalMentorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        mockMvc.perform(post("/api/messages/threads/{id}/messages", threadId)
                        .header("Authorization", "Bearer " + data.externalMentorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"Thanks for sharing\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/messages/unread-count")
                        .header("Authorization", "Bearer " + data.otherStudentToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
        mockMvc.perform(get("/api/messages/threads/{id}", threadId)
                        .header("Authorization", "Bearer " + data.otherStudentToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void threadCreationAndStompSubscriptionRequireParticipationAndActiveGrant() throws Exception {
        TestData data = createTestData();
        ExternalAccessGrant grant = grantRepository.findAll().getFirst();
        grant.setRevoked(true);
        grantRepository.save(grant);

        mockMvc.perform(post("/api/messages/threads")
                        .header("Authorization", "Bearer " + data.studentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(threadRequest(data)))
                .andExpect(status().isForbidden());

        grant.setRevoked(false);
        grantRepository.save(grant);
        String threadId = createThread(data, data.studentToken());
        StompHeaderAccessor connectAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connectAccessor.setNativeHeader("Authorization", "Bearer " + data.studentToken());
        Message<?> connectMessage = MessageBuilder.createMessage(new byte[0], connectAccessor.getMessageHeaders());
        Message<?> authenticated = stompAuthChannelInterceptor.preSend(connectMessage, null);
        StompHeaderAccessor authenticatedAccessor = MessageHeaderAccessor.getAccessor(authenticated, StompHeaderAccessor.class);
        assertNotNull(authenticatedAccessor.getUser());

        StompHeaderAccessor allowedSubscribe = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        allowedSubscribe.setDestination("/user/queue/threads/" + threadId);
        allowedSubscribe.setUser(authenticatedAccessor.getUser());
        stompAuthChannelInterceptor.preSend(
                MessageBuilder.createMessage(new byte[0], allowedSubscribe.getMessageHeaders()), null);

        StompHeaderAccessor deniedSubscribe = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        deniedSubscribe.setDestination("/user/queue/threads/" + threadId);
        deniedSubscribe.setUser(new UsernamePasswordAuthenticationToken(
                data.otherStudentId().toString(), null, List.of()));
        Message<?> deniedMessage = MessageBuilder.createMessage(new byte[0], deniedSubscribe.getMessageHeaders());
        assertThrows(AccessDeniedException.class, () -> stompAuthChannelInterceptor.preSend(deniedMessage, null));
    }

    private String createThread(TestData data, String token) throws Exception {
        return objectMapper.readTree(mockMvc.perform(post("/api/messages/threads")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(threadRequest(data)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("id").asText();
    }

    private String threadRequest(TestData data) throws Exception {
        return objectMapper.writeValueAsString(new CreateThreadBody(data.submissionId(), data.externalMentorId()));
    }

    private TestData createTestData() {
        User student = saveUser("message-student@example.com", Role.STUDENT);
        User externalMentor = saveUser("message-mentor@example.com", Role.EXTERNAL_MENTOR);
        User otherStudent = saveUser("other-student@example.com", Role.STUDENT);
        StudentProfile profile = new StudentProfile();
        profile.setUser(student);
        profile.setStartDate(LocalDate.now());
        profile = studentProfileRepository.save(profile);
        Cohort cohort = new Cohort();
        cohort.setName("Message cohort " + UUID.randomUUID());
        cohort = cohortRepository.save(cohort);
        Assignment assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle("Message assignment");
        assignment.setDueAt(Instant.now().plusSeconds(3600));
        assignment = assignmentRepository.save(assignment);
        Submission submission = new Submission();
        submission.setAssignment(assignment);
        submission.setStudentProfile(profile);
        submission.setSubmittedAt(Instant.now());
        submission.setStatus(SubmissionStatus.ON_TIME);
        submission = submissionRepository.save(submission);
        ExternalAccessGrant grant = new ExternalAccessGrant();
        grant.setAssignment(assignment);
        grant.setSubmission(submission);
        grant.setExternalMentor(externalMentor);
        grant.setRevoked(false);
        grantRepository.save(grant);
        return new TestData(
                jwtService.issueTokenPair(student).accessToken(),
                jwtService.issueTokenPair(externalMentor).accessToken(),
                jwtService.issueTokenPair(otherStudent).accessToken(),
                student.getId(), otherStudent.getId(), externalMentor.getId(), submission.getId());
    }

    private User saveUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("Message");
        user.setLastName(role.name());
        user.setRole(role);
        return userRepository.save(user);
    }

    private record CreateThreadBody(UUID submissionId, UUID externalMentorId) {
    }

    private record TestData(
            String studentToken,
            String externalMentorToken,
            String otherStudentToken,
            UUID studentId,
            UUID otherStudentId,
            UUID externalMentorId,
            UUID submissionId) {
    }
}