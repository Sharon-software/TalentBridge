package com.sharonsoftware.talentbridge.analysis;

import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.repository.ScoreCardRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AnalysisScheduler {

    private final ScoreCardRepository scoreCardRepository;
    private final SubmissionRepository submissionRepository;
    private final AnalysisWorker analysisWorker;

    public AnalysisScheduler(
            ScoreCardRepository scoreCardRepository,
            SubmissionRepository submissionRepository,
            AnalysisWorker analysisWorker) {
        this.scoreCardRepository = scoreCardRepository;
        this.submissionRepository = submissionRepository;
        this.analysisWorker = analysisWorker;
    }

    public void schedule(UUID submissionId) {
        var submission = submissionRepository.findById(submissionId).orElseThrow();
        ScoreCard scoreCard = scoreCardRepository.findBySubmissionId(submissionId).orElseGet(ScoreCard::new);
        scoreCard.setSubmission(submission);
        scoreCard.setAnalysisStatus(AnalysisStatus.PENDING);
        scoreCard.setErrorMessage(null);
        scoreCardRepository.save(scoreCard);
        analysisWorker.analyze(submissionId);
    }
}