package com.sharonsoftware.talentbridge.analysis;

import java.util.List;

public record AnalysisResult(
        Scores scores,
        List<String> strengths,
        List<String> weaknesses,
        List<String> suggestions) {

    public record Scores(int quality, int correctness, int originality, int communication) {
    }
}