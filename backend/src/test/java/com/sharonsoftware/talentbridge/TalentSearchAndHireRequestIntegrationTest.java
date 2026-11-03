package com.sharonsoftware.talentbridge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.CvEntry;
import com.sharonsoftware.talentbridge.domain.Qualification;
import com.sharonsoftware.talentbridge.domain.RecommendationLetter;
import com.sharonsoftware.talentbridge.domain.RecommendationLetterStatus;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.CvEntryRepository;
import com.sharonsoftware.talentbridge.repository.QualificationRepository;
import com.sharonsoftware.talentbridge.repository.RecommendationLetterRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
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
class TalentSearchAndHireRequestIntegrationTest extends DatabaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private QualificationRepository qualificationRepository;

    @Autowired
    private CvEntryRepository cvEntryRepository;

    @Autowired
    private CohortRepository cohortRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ScoreCardRepository scoreCardRepository;

    @Autowired
    private RecommendationLetterRepository letterRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User recruiter;
    private User mentor;
    private User student;
    private User secondStudent;
    private User recentStudent;
    private StudentProfile studentProfile;

    @BeforeEach
    void setUpTalent() {
        recruiter = saveUser("recruiter@example.com", Role.RECRUITER);
        mentor = saveUser("talent-mentor@example.com", Role.MENTOR);
        student = saveUser("talent-student@example.com", Role.STUDENT);
        secondStudent = saveUser("talent-second@example.com", Role.STUDENT);
        recentStudent = saveUser("talent-recent@example.com", Role.STUDENT);

        studentProfile = createStudent(student, LocalDate.now().minusMonths(8), new BigDecimal("95.00"),
                LocalDate.now().minusYears(4), "Bachelor of Computer Science", Set.of("Java", "Spring"));
        createStudent(secondStudent, LocalDate.now().minusMonths(7), new BigDecimal("80.00"),
                LocalDate.now().minusYears(2), "Computer Engineering", Set.of("Java"));
        createStudent(recentStudent, LocalDate.now().minusMonths(4), new BigDecimal("99.00"),
                LocalDate.now().minusYears(6), "Computer Science", Set.of("Java"));
        addScorecardAndPublishedLetter(studentProfile, mentor);
    }

    @Test
    void searchFiltersSixMonthEligibilityAndPaginatesByScoreThenDetailContainsStudentData() throws Exception {
        mockMvc.perform(get("/api/recruiters/students")
                        .header("Authorization", bearer(recruiter))
                        .param("qualification", "computer")
                        .param("minYearsExperience", "2")
                        .param("skill", "JAVA")
                        .param("page", "0")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].studentProfileId").value(studentProfile.getId().toString()))
                .andExpect(jsonPath("$.content[0].yearsExperience").value(4));

        mockMvc.perform(get("/api/recruiters/students")
                        .header("Authorization", bearer(recruiter))
                        .param("qualification", "computer")
                        .param("minYearsExperience", "2")
                        .param("skill", "Java")
                        .param("page", "1")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].studentProfileId").value(
                        studentProfileRepository.findByUserId(secondStudent.getId()).orElseThrow().getId().toString()));

        mockMvc.perform(get("/api/recruiters/students/{id}", studentProfile.getId())
                        .header("Authorization", bearer(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cv[0].skills").value(org.hamcrest.Matchers.containsInAnyOrder("Java", "Spring")))
                .andExpect(jsonPath("$.scoreCards[0].score").value(92.0))
                .andExpect(jsonPath("$.recommendationLetters[0].content").value("Published reference"));
    }

    @Test
    void recruiterAndMentorCanCreateHireRequestsButStudentsCannot() throws Exception {
        String request = objectMapper.writeValueAsString(
                new HireRequestBody(studentProfile.getId(), "Northwind", "hiring@example.com", "Please contact me."));
        mockMvc.perform(post("/api/hire-requests")
                        .header("Authorization", bearer(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));
        mockMvc.perform(post("/api/hire-requests")
                        .header("Authorization", bearer(mentor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/hire-requests")
                        .header("Authorization", bearer(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/hire-requests").header("Authorization", bearer(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].companyName").value("Northwind"));
    }

    private StudentProfile createStudent(
            User user,
            LocalDate startDate,
            BigDecimal overallScore,
            LocalDate experienceStart,
            String qualificationName,
            Set<String> skills) {
        StudentProfile profile = new StudentProfile();
        profile.setUser(user);
        profile.setStartDate(startDate);
        profile.setOverallScore(overallScore);
        profile = studentProfileRepository.save(profile);

        Qualification qualification = new Qualification();
        qualification.setStudentProfile(profile);
        qualification.setName(qualificationName);
        qualificationRepository.save(qualification);

        CvEntry cvEntry = new CvEntry();
        cvEntry.setStudentProfile(profile);
        cvEntry.setTitle("Software Engineer");
        cvEntry.setOrganization("Example Corp");
        cvEntry.setStartDate(experienceStart);
        cvEntry.setSkills(skills);
        cvEntryRepository.save(cvEntry);
        return profile;
    }

    private void addScorecardAndPublishedLetter(StudentProfile profile, User author) {
        Cohort cohort = new Cohort();
        cohort.setName("Talent cohort " + UUID.randomUUID());
        cohort = cohortRepository.save(cohort);
        Assignment assignment = new Assignment();
        assignment.setCohort(cohort);
        assignment.setTitle("Portfolio review");
        assignment.setDueAt(Instant.now().plusSeconds(3600));
        assignment = assignmentRepository.save(assignment);
        Submission submission = new Submission();
        submission.setAssignment(assignment);
        submission.setStudentProfile(profile);
        submission.setSubmittedAt(Instant.now());
        submission.setStatus(SubmissionStatus.ON_TIME);
        submission = submissionRepository.save(submission);

        ScoreCard scoreCard = new ScoreCard();
        scoreCard.setSubmission(submission);
        scoreCard.setAnalysisStatus(AnalysisStatus.COMPLETED);
        scoreCard.setScore(new BigDecimal("92.00"));
        scoreCard.setQualityScore(90);
        scoreCardRepository.save(scoreCard);

        RecommendationLetter letter = new RecommendationLetter();
        letter.setStudentProfile(profile);
        letter.setAuthor(author);
        letter.setAuthorName("Talent Mentor");
        letter.setContent("Published reference");
        letter.setStatus(RecommendationLetterStatus.PUBLISHED);
        letter.setPublishedAt(Instant.now());
        letterRepository.save(letter);
    }

    private User saveUser(String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("test-password"));
        user.setFirstName("Talent");
        user.setLastName(role.name());
        user.setRole(role);
        return userRepository.save(user);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.issueTokenPair(user).accessToken();
    }

    private record HireRequestBody(UUID studentProfileId, String companyName, String contactEmail, String message) {
    }
}