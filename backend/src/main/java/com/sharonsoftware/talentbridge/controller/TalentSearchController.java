package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.CvEntry;
import com.sharonsoftware.talentbridge.domain.Qualification;
import com.sharonsoftware.talentbridge.domain.RecommendationLetter;
import com.sharonsoftware.talentbridge.domain.RecommendationLetterStatus;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.CvEntryRepository;
import com.sharonsoftware.talentbridge.repository.QualificationRepository;
import com.sharonsoftware.talentbridge.repository.RecommendationLetterRepository;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.StudentSearchSpecifications;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/recruiters/students")
@PreAuthorize("hasAnyRole('RECRUITER', 'MENTOR', 'EMPLOYER')")
public class TalentSearchController {

    private static final int MAX_PAGE_SIZE = 100;

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final QualificationRepository qualificationRepository;
    private final CvEntryRepository cvEntryRepository;
    private final ScoreCardRepository scoreCardRepository;
    private final RecommendationLetterRepository letterRepository;

    public TalentSearchController(
            StudentProfileRepository studentProfileRepository,
            UserRepository userRepository,
            QualificationRepository qualificationRepository,
            CvEntryRepository cvEntryRepository,
            ScoreCardRepository scoreCardRepository,
            RecommendationLetterRepository letterRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.qualificationRepository = qualificationRepository;
        this.cvEntryRepository = cvEntryRepository;
        this.scoreCardRepository = scoreCardRepository;
        this.letterRepository = letterRepository;
    }

    @GetMapping
        public StudentPage search(
            @RequestParam(required = false) @Size(max = 200) String qualification,
                        @RequestParam(required = false) List<@Size(max = 200) String> qualifications,
            @RequestParam(required = false) @Min(0) @Max(80) Integer minYearsExperience,
            @RequestParam(required = false) @Size(max = 100) String skill,
                        @RequestParam(required = false) @Size(max = 200) String search,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
        var pageable = PageRequest.of(page, size);
        Page<StudentProfile> profiles = studentProfileRepository.findAll(
                StudentSearchSpecifications.talentSearch(
                        LocalDate.now().minusMonths(6), qualification, qualifications, minYearsExperience, skill, search),
                pageable);
        return new StudentPage(
                profiles.map(this::toSummary).getContent(),
                profiles.getNumber(),
                profiles.getSize(),
                profiles.getTotalElements(),
                profiles.getTotalPages(),
                profiles.isFirst(),
                profiles.isLast());
    }

        @GetMapping("/filters")
        public TalentFilters filters() {
                return new TalentFilters(qualificationRepository.findEligibleNames(LocalDate.now().minusMonths(6)));
        }

    @GetMapping("/{studentProfileId}")
    public StudentDetail detail(@PathVariable UUID studentProfileId) {
        StudentProfile profile = studentProfileRepository.findById(studentProfileId)
                .filter(student -> !student.getStartDate().isAfter(LocalDate.now().minusMonths(6)))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Eligible student not found"));
        List<CvEntry> cv = cvEntryRepository.findAllByStudentProfileIdOrderByStartDateDesc(studentProfileId);
        List<ScoreCard> scoreCards = scoreCardRepository.findAllBySubmissionStudentProfileIdOrderByIdAsc(studentProfileId);
        List<RecommendationLetter> letters = letterRepository.findAllByStudentProfileIdAndStatusOrderByPublishedAtDesc(
                studentProfileId, RecommendationLetterStatus.PUBLISHED);
        return new StudentDetail(
                toSummary(profile),
                cv.stream().map(TalentSearchController::toCvEntry).toList(),
                scoreCards.stream().map(TalentSearchController::toScoreCard).toList(),
                letters.stream().map(TalentSearchController::toLetter).toList());
    }

    private StudentSummary toSummary(StudentProfile profile) {
        User user = userRepository.findById(profile.getUser().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));
        LocalDate earliestExperience = cvEntryRepository.findEarliestStartDateByStudentProfileId(profile.getId());
        int yearsExperience = earliestExperience == null || earliestExperience.isAfter(LocalDate.now())
                ? 0
                : Math.max(0, Period.between(earliestExperience, LocalDate.now()).getYears());
        List<String> qualifications = qualificationRepository.findAllByStudentProfileId(profile.getId()).stream()
                .map(Qualification::getName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        List<String> skills = cvEntryRepository.findSkillsByStudentProfileId(profile.getId()).stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        return new StudentSummary(
                profile.getId(), user.getFirstName(), user.getLastName(), profile.getStartDate(),
                profile.getOverallScore(), yearsExperience, qualifications, skills);
    }

    private static CvEntrySummary toCvEntry(CvEntry entry) {
        return new CvEntrySummary(entry.getId(), entry.getTitle(), entry.getOrganization(), entry.getDescription(),
                entry.getStartDate(), entry.getEndDate(), List.copyOf(entry.getSkills()));
    }

    private static ScoreCardSummary toScoreCard(ScoreCard card) {
        return new ScoreCardSummary(
                card.getSubmission().getId(), card.getAnalysisStatus(), card.getScore(), card.getQualityScore(),
                card.getCorrectnessScore(), card.getOriginalityScore(), card.getCommunicationScore(),
                card.getStrengths(), card.getWeaknesses(), card.getSuggestions());
    }

    private static RecommendationLetterSummary toLetter(RecommendationLetter letter) {
        return new RecommendationLetterSummary(letter.getId(), letter.getAuthorName(), letter.getContent(), letter.getPublishedAt());
    }

    public record StudentSummary(
            UUID studentProfileId,
            String firstName,
            String lastName,
            LocalDate startDate,
            java.math.BigDecimal overallScore,
            int yearsExperience,
            List<String> qualifications,
            List<String> skills) {
    }

    public record StudentDetail(
            StudentSummary student,
            List<CvEntrySummary> cv,
            List<ScoreCardSummary> scoreCards,
            List<RecommendationLetterSummary> recommendationLetters) {
    }

    public record StudentPage(
            List<StudentSummary> content,
            int number,
            int size,
            long totalElements,
            int totalPages,
            boolean first,
            boolean last) {
    }

    public record TalentFilters(List<String> ictQualifications) {
    }

    public record CvEntrySummary(
            UUID id,
            String title,
            String organization,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            List<String> skills) {
    }

    public record ScoreCardSummary(
            UUID submissionId,
            AnalysisStatus status,
            java.math.BigDecimal score,
            Integer quality,
            Integer correctness,
            Integer originality,
            Integer communication,
            List<String> strengths,
            List<String> weaknesses,
            List<String> suggestions) {
    }

    public record RecommendationLetterSummary(UUID id, String authorName, String content, java.time.Instant publishedAt) {
    }
}