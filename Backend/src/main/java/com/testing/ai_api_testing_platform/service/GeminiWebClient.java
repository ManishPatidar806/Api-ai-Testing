package com.testing.ai_api_testing_platform.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

@Component
public class GeminiWebClient implements AiClient {

    private final WebClient webClient;
    private final String baseUrl;
    private final String model;
    private final String apiKey;
    private final boolean mockEnabled;

    public GeminiWebClient(WebClient webClient,
                           @Value("${app.ai.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl,
                           @Value("${app.ai.model:gemini-2.5-flash}") String model,
                           @Value("${app.ai.api-key:}") String apiKey,
                           @Value("${app.ai.mock-enabled:true}") boolean mockEnabled) {
        this.webClient = webClient;
        this.baseUrl = baseUrl;
        this.model = model;
        this.apiKey = apiKey;
        this.mockEnabled = mockEnabled;
    }

    @Override
    public String generate(String prompt) {
        if (mockEnabled) {
            return "MOCK_AI_RESPONSE: " + prompt;
        }

        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("AI_API_KEY is missing while mock mode is disabled");
        }

        GenerateContentResponse response;
        try {
            response = webClient.post()
                .uri(baseUrl + "/models/" + model + ":generateContent?key=" + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(new GenerateContentRequest(
                    List.of(new Content(List.of(new Part(prompt)))),
                    new GenerationConfig(0.2)
                ))
                .retrieve()
                .bodyToMono(GenerateContentResponse.class)
                .block();
        } catch (WebClientResponseException ex) {
            return "AI provider error (" + ex.getStatusCode().value() + "): " + ex.getResponseBodyAsString();
        } catch (Exception ex) {
            return "AI provider call failed: " + ex.getMessage();
        }

        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            return "AI returned an empty response.";
        }

        Candidate firstCandidate = response.candidates().get(0);
        if (firstCandidate == null || firstCandidate.content() == null || firstCandidate.content().parts() == null
                || firstCandidate.content().parts().isEmpty() || firstCandidate.content().parts().get(0) == null
                || firstCandidate.content().parts().get(0).text() == null) {
            return "AI returned empty message content.";
        }

        return firstCandidate.content().parts().get(0).text();
    }

    private record GenerateContentRequest(List<Content> contents, GenerationConfig generationConfig) {
    }

    private record Content(List<Part> parts) {
    }

    private record Part(String text) {
    }

    private record GenerationConfig(Double temperature) {
    }

    private record GenerateContentResponse(List<Candidate> candidates) {
    }

    private record Candidate(Content content) {
    }
}
