package com.sharonsoftware.talentbridge.analysis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ClaudeHttpClient implements ClaudeApiClient {

    private static final String RUBRIC_PROMPT = """
            Assess the submitted work using only the supplied text. Do not invent requirements or claim plagiarism.
            Return only a JSON object with this exact shape:
            {"scores":{"quality":0,"correctness":0,"originality":0,"communication":0},"strengths":["..."],"weaknesses":["..."],"suggestions":["..."]}
            Each score must be an integer from 0 to 100. Quality measures completeness and craft; correctness measures factual and logical accuracy; originality measures independent thought and distinctiveness within the submission; communication measures clarity and organization. Give concise, evidence-based feedback.
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final String endpoint;

    public ClaudeHttpClient(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${app.analysis.claude.api-key:}") String apiKey,
            @Value("${app.analysis.claude.model:claude-sonnet-4-5-20250929}") String model,
            @Value("${app.analysis.claude.endpoint:https://api.anthropic.com/v1/messages}") String endpoint) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.endpoint = endpoint;
    }

    @Override
    public AnalysisResult analyze(String submissionText) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY is not configured");
        }
        Map<String, Object> request = Map.of(
                "model", model,
                "max_tokens", 2048,
                "system", RUBRIC_PROMPT,
                "messages", List.of(Map.of("role", "user", "content", submissionText)));
        JsonNode response = restClient.post()
                .uri(endpoint)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .body(request)
                .retrieve()
                .body(JsonNode.class);
        String text = response == null ? null : response.path("content").path(0).path("text").asText(null);
        if (text == null || text.isBlank()) {
            throw new IllegalStateException("Claude returned no analysis text");
        }
        try {
            return objectMapper.readValue(stripCodeFence(text), AnalysisResult.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Claude returned invalid analysis JSON", exception);
        }
    }

    private static String stripCodeFence(String text) {
        String json = text.trim();
        if (json.startsWith("```")) {
            int firstLineBreak = json.indexOf('\n');
            if (firstLineBreak >= 0) {
                json = json.substring(firstLineBreak + 1);
            }
            json = json.trim();
            if (json.endsWith("```")) {
                json = json.substring(0, json.length() - 3);
            }
        }
        return json.trim();
    }
}