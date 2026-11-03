package com.sharonsoftware.talentbridge.analysis;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class AnalysisWorker {

    private final AnalysisService analysisService;

    public AnalysisWorker(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @Async("analysisExecutor")
    public CompletableFuture<Void> analyze(UUID submissionId) {
        analysisService.analyzeSubmission(submissionId);
        return CompletableFuture.completedFuture(null);
    }
}