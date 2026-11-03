package com.sharonsoftware.talentbridge.analysis;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.storage.FileStorage;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AnalysisService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AnalysisService.class);
    private static final int MAX_API_ATTEMPTS = 3;
    private static final BigDecimal ASSIGNMENT_WEIGHT = new BigDecimal("0.80");
    private static final BigDecimal PUNCTUALITY_WEIGHT = new BigDecimal("0.20");

    private final ScoreCardRepository scoreCardRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final FileStorage fileStorage;
    private final DocumentTextExtractor textExtractor;
    private final ClaudeApiClient claudeApiClient;

    public AnalysisService(
            ScoreCardRepository scoreCardRepository,
            SubmissionRepository submissionRepository,
            StudentProfileRepository studentProfileRepository,
            FileStorage fileStorage,
            DocumentTextExtractor textExtractor,
            ClaudeApiClient claudeApiClient) {
        this.scoreCardRepository = scoreCardRepository;
        this.submissionRepository = submissionRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.fileStorage = fileStorage;
        this.textExtractor = textExtractor;
        this.claudeApiClient = claudeApiClient;
    }

    public void analyzeSubmission(UUID submissionId) {
        ScoreCard scoreCard = scoreCardRepository.findBySubmissionId(submissionId).orElse(null);
        if (scoreCard == null) {
            return;
        }
        try {
            Submission submission = submissionRepository.findById(submissionId).orElseThrow();
            String text;
            try (InputStream input = fileStorage.open(submission.getStorageKey())) {
                text = textExtractor.extract(input, submission.getOriginalFilename());
            }
            AnalysisResult result = analyzeWithRetries(text);
            saveResult(scoreCard, result);
            scoreCardRepository.save(scoreCard);
            recomputeOverallScore(submission.getStudentProfile().getId());
        } catch (Exception exception) {
            LOGGER.warn("Analysis failed for submission {} after retries ({})", submissionId, exception.getClass().getSimpleName());
            scoreCard.setAnalysisStatus(AnalysisStatus.FAILED);
            scoreCard.setErrorMessage("Analysis failed after retrying the Claude API");
            scoreCardRepository.save(scoreCard);
        }
    }

    private AnalysisResult analyzeWithRetries(String text) {
        RuntimeException lastFailure = null;
        for (int attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt++) {
            try {
                AnalysisResult result = claudeApiClient.analyze(text);
                validate(result);
                return result;
            } catch (RuntimeException exception) {
                lastFailure = exception;
                if (attempt < MAX_API_ATTEMPTS) {
                    try {
                        Thread.sleep(100L * attempt);
                    } catch (InterruptedException interruptedException) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException("Analysis retry interrupted", interruptedException);
                    }
                }
            }
        }
        throw lastFailure;
    }

    private static void validate(AnalysisResult result) {
        if (result == null || result.scores() == null) {
            throw new IllegalArgumentException("Analysis response is missing rubric scores");
        }
        AnalysisResult.Scores scores = result.scores();
        if (!validScore(scores.quality())
                || !validScore(scores.correctness())
                || !validScore(scores.originality())
                || !validScore(scores.communication())) {
            throw new IllegalArgumentException("Rubric scores must be between 0 and 100");
        }
        if (result.strengths() == null || result.weaknesses() == null || result.suggestions() == null) {
            throw new IllegalArgumentException("Analysis response is missing feedback lists");
        }
    }

    private static boolean validScore(int score) {
        return score >= 0 && score <= 100;
    }

    private static void saveResult(ScoreCard card, AnalysisResult result) {
        AnalysisResult.Scores scores = result.scores();
        card.setQualityScore(scores.quality());
        card.setCorrectnessScore(scores.correctness());
        card.setOriginalityScore(scores.originality());
        card.setCommunicationScore(scores.communication());
        card.setScore(BigDecimal.valueOf(scores.quality() + scores.correctness() + scores.originality() + scores.communication())
                .divide(BigDecimal.valueOf(4), 2, RoundingMode.HALF_UP));
        card.setStrengths(List.copyOf(result.strengths()));
        card.setWeaknesses(List.copyOf(result.weaknesses()));
        card.setSuggestions(List.copyOf(result.suggestions()));
        card.setFeedback(String.join(System.lineSeparator(), result.suggestions()));
        card.setErrorMessage(null);
        card.setAnalysisStatus(AnalysisStatus.COMPLETED);
    }

    private void recomputeOverallScore(UUID studentProfileId) {
        BigDecimal assignmentAverage = scoreCardRepository.averageCompletedScoreByStudentProfileId(
                studentProfileId, AnalysisStatus.COMPLETED);
        long totalSubmissions = submissionRepository.countByStudentProfileId(studentProfileId);
        long onTimeSubmissions = submissionRepository.countByStudentProfileIdAndStatus(
                studentProfileId, SubmissionStatus.ON_TIME);
        BigDecimal punctuality = totalSubmissions == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(onTimeSubmissions).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totalSubmissions), 2, RoundingMode.HALF_UP);
        BigDecimal assignmentComponent = assignmentAverage == null
                ? BigDecimal.ZERO
                : assignmentAverage.multiply(ASSIGNMENT_WEIGHT);
        BigDecimal overallScore = assignmentComponent.add(punctuality.multiply(PUNCTUALITY_WEIGHT))
                .setScale(2, RoundingMode.HALF_UP);
        studentProfileRepository.findById(studentProfileId).ifPresent(profile -> saveOverallScore(profile, overallScore));
    }

    private void saveOverallScore(StudentProfile profile, BigDecimal overallScore) {
        profile.setOverallScore(overallScore);
        studentProfileRepository.save(profile);
    }
}