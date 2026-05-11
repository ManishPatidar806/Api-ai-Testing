package com.testing.ai_api_testing_platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.domain.enums.HttpMethodType;
import com.testing.ai_api_testing_platform.dto.request.AiChatRequest;
import com.testing.ai_api_testing_platform.dto.response.AiChatResponse;
import com.testing.ai_api_testing_platform.dto.request.AiErrorAnalysisRequest;
import com.testing.ai_api_testing_platform.dto.response.AiErrorAnalysisResponse;
import com.testing.ai_api_testing_platform.dto.AiGeneratedTestCase;
import com.testing.ai_api_testing_platform.dto.request.AiTestCaseGeneratorRequest;
import com.testing.ai_api_testing_platform.dto.response.AiTestCaseGeneratorResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.repository.ApiRequestRepository;
import com.testing.ai_api_testing_platform.repository.ApiResponseRepository;
import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AiServiceImpl  implements AiService {

    private static final String DEFAULT_ROOT_CAUSE = "Unable to determine exact root cause.";
    private static final String DEFAULT_FIX_SUGGESTION = "Validate endpoint, payload, auth, and upstream dependency state.";
    private static final String DEFAULT_OPTIMIZATION = "Use tighter timeouts, retries, and structured logging for diagnostics.";
    private static final List<String> VALID_TEST_CASE_CATEGORIES = List.of("SUCCESS", "FAILURE", "EDGE");

    private final AiClient aiClient;
    private final UserRepository userRepository;
    private final ApiRequestRepository apiRequestRepository;
    private final ApiResponseRepository apiResponseRepository;
    private final ObjectMapper objectMapper;

    public AiServiceImpl(AiClient aiClient,
                         UserRepository userRepository,
                         ApiRequestRepository apiRequestRepository,
                         ApiResponseRepository apiResponseRepository,
                         ObjectMapper objectMapper) {
        this.aiClient = aiClient;
        this.userRepository = userRepository;
        this.apiRequestRepository = apiRequestRepository;
        this.apiResponseRepository = apiResponseRepository;
        this.objectMapper = objectMapper;
    }

    @Cacheable(value = "aiErrorAnalysis", key = "#email + ':' + #request.apiRequestId + ':' + #request.errorMessage")
    @Transactional(readOnly = true)
    public AiErrorAnalysisResponse analyzeError(String email, AiErrorAnalysisRequest request) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedRequest(user.getId(), request.apiRequestId());
        ApiResponse latest = apiResponseRepository.findTopByApiRequestIdAndApiRequestUserIdOrderByExecutedAtDesc(apiRequest.getId(), user.getId())
                .orElse(null);

        String prompt = "You are an API reliability engineer. Analyze the following API failure context.\n"
                + "URL: " + apiRequest.getUrl() + "\n"
                + "Method: " + apiRequest.getHttpMethod() + "\n"
                + "Request body: " + nullSafe(apiRequest.getRequestBody()) + "\n"
                + "Last status: " + (latest == null ? "N/A" : latest.getStatusCode()) + "\n"
                + "Last response time ms: " + (latest == null ? "N/A" : latest.getResponseTimeMs()) + "\n"
                + "Last response body: " + (latest == null ? "N/A" : nullSafe(latest.getResponseBody())) + "\n"
                + "Error message: " + nullSafe(request.errorMessage()) + "\n"
            + "Return ONLY JSON with keys: rootCause, fixSuggestion, optimizationRecommendation."
            + " Keep each value concise and actionable.";

        String modelResponse = aiClient.generate(prompt);

        Map<String, String> structured = parseAnalysisJson(modelResponse);
        if (structured != null) {
            return new AiErrorAnalysisResponse(
                structured.getOrDefault("rootCause", DEFAULT_ROOT_CAUSE),
                structured.getOrDefault("fixSuggestion", DEFAULT_FIX_SUGGESTION),
                structured.getOrDefault("optimizationRecommendation", DEFAULT_OPTIMIZATION),
                modelResponse
            );
        }

        return new AiErrorAnalysisResponse(
                extractSection(modelResponse, "ROOT_CAUSE", DEFAULT_ROOT_CAUSE),
                extractSection(modelResponse, "FIX", DEFAULT_FIX_SUGGESTION),
                extractSection(modelResponse, "OPTIMIZATION", DEFAULT_OPTIMIZATION),
                modelResponse
        );
    }

    @Cacheable(value = "aiTestGeneration", key = "#email + ':' + #request.apiRequestId + ':' + #request.endpointUrl + ':' + #request.endpointMethod + ':' + #request.requestBodyTemplate + ':' + #request.requestHeadersTemplate + ':' + #request.queryParamsTemplate + ':' + #request.authRequirements + ':' + #request.successCriteria + ':' + #request.failureCriteria + ':' + #request.requiredResponseFields + ':' + #request.forbiddenResponseFields + ':' + #request.requiredJsonPaths + ':' + #request.expectedJsonPathValues + ':' + #request.forbiddenJsonPathValues + ':' + #request.stableResponseKeywords + ':' + #request.enforceKeywordAssertion + ':' + #request.additionalContext + ':' + #request.strictMode")
    @Transactional(readOnly = true)
    public AiTestCaseGeneratorResponse generateTestCases(String email, AiTestCaseGeneratorRequest request) {
        TestGenerationSource source = resolveTestGenerationSource(email, request);

        boolean strictMode = Boolean.TRUE.equals(request.strictMode());

        Prompt prompt = new Prompt(List.of(
            new SystemMessage("""
                You are a senior API QA engineer.
                Generate endpoint-specific test cases only.
                Do not produce generic placeholders.
                                Return valid JSON only, with this exact shape:
                                {
                                    "testCases": [
                                        {
                                            "name": "...",
                                            "description": "...",
                                            "expectedStatusCode": 200,
                                            "maxResponseTimeMs": 2000,
                                            "expectedKeyword": null,
                                            "requiredResponseTokens": "id,status",
                                            "forbiddenResponseTokens": "password,stacktrace",
                                            "requiredJsonPaths": "data.id,data.status",
                                            "expectedJsonPathValues": "data.status=SUCCESS",
                                            "forbiddenJsonPathValues": "error.code=INTERNAL",
                                            "category": "SUCCESS"
                                        }
                                    ]
                                }
                                CATEGORY must be one of SUCCESS, FAILURE, EDGE.
                                Generate 6 concrete test cases using endpoint path, method, params, and request-body fields.
                                expectedKeyword is OPTIONAL and should be null unless a stable deterministic response token is explicitly provided.
                """),
                            new UserMessage(buildEndpointSpecificTestPrompt(
                                source.endpointUrl(),
                                source.endpointMethod(),
                                source.headers(),
                                source.requestBodyTemplate(),
                                source.latest(),
                                request
                            ))
        ));

        String modelResponse = aiClient.generate(prompt.getContents());
        ParsedGeneration parsedGeneration = parseOrRetryGeneratedCases(modelResponse);
        List<AiGeneratedTestCase> generated = parsedGeneration.generatedCases();
        modelResponse = parsedGeneration.rawModelResponse();

        if (generated.isEmpty()) {
            if (strictMode) {
                throw new IllegalArgumentException("Strict mode enabled: AI output was not valid JSON testCases format. Refine context and retry.");
            }
            generated = buildDeterministicFallbackCases(
                source.endpointMethod() + " " + source.endpointUrl(),
                source.requestBodyTemplate()
            );
        }

        generated = applyKeywordAssertionPolicy(generated, request);

        return new AiTestCaseGeneratorResponse(generated, modelResponse);
    }

    private TestGenerationSource resolveTestGenerationSource(String email, AiTestCaseGeneratorRequest request) {
        if (request.apiRequestId() == null) {
            if (!StringUtils.hasText(request.endpointUrl()) || request.endpointMethod() == null) {
                throw new IllegalArgumentException("Provide either apiRequestId or both endpointUrl and endpointMethod for AI test generation.");
            }
            return new TestGenerationSource(
                request.endpointUrl().trim(),
                request.endpointMethod(),
                request.requestBodyTemplate(),
                "{}",
                null
            );
        }

        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedRequest(user.getId(), request.apiRequestId());
        ApiResponse latest = apiResponseRepository.findTopByApiRequestIdAndApiRequestUserIdOrderByExecutedAtDesc(apiRequest.getId(), user.getId())
            .orElse(null);

        return new TestGenerationSource(
            apiRequest.getUrl(),
            apiRequest.getHttpMethod(),
            apiRequest.getRequestBody(),
            String.valueOf(apiRequest.getHeaders()),
            latest
        );
    }

    private ParsedGeneration parseOrRetryGeneratedCases(String modelResponse) {
        List<AiGeneratedTestCase> generated = parseGeneratedTestCasesFromJson(modelResponse);
        if (!generated.isEmpty()) {
            return new ParsedGeneration(generated, modelResponse);
        }

        String retryPrompt = "Reformat the following content into ONLY valid JSON with key testCases and required fields."
            + " Keep endpoint specificity and do not add markdown:\n" + modelResponse;
        String retryResponse = aiClient.generate(retryPrompt);
        generated = parseGeneratedTestCasesFromJson(retryResponse);
        return new ParsedGeneration(generated, modelResponse + "\n\nRETRY_RESPONSE:\n" + retryResponse);
    }

    @Cacheable(value = "aiChat", key = "#email + ':' + #request.apiRequestId + ':' + #request.message")
    @Transactional(readOnly = true)
    public AiChatResponse chat(String email, AiChatRequest request) {
        User user = getUserByEmail(email);

        String context = "";
        if (request.apiRequestId() != null) {
            ApiRequest apiRequest = getOwnedRequest(user.getId(), request.apiRequestId());
            ApiResponse latest = apiResponseRepository.findTopByApiRequestIdAndApiRequestUserIdOrderByExecutedAtDesc(apiRequest.getId(), user.getId())
                    .orElse(null);
            context = "Endpoint context: " + apiRequest.getHttpMethod() + " " + apiRequest.getUrl()
                    + ", lastStatus=" + (latest == null ? "N/A" : latest.getStatusCode())
                    + ", lastLatencyMs=" + (latest == null ? "N/A" : latest.getResponseTimeMs()) + ".\n";
        }

        Prompt prompt = new Prompt(List.of(
                new SystemMessage("You are assisting with API debugging and optimization. Respond specifically using endpoint context when provided."),
                new UserMessage(context + "User question: " + request.message())
        ));

        String modelResponse = aiClient.generate(prompt.getContents());
        return new AiChatResponse(modelResponse, modelResponse);
    }

    private String buildEndpointSpecificTestPrompt(String endpointUrl,
                                                   HttpMethodType endpointMethod,
                                                   String headers,
                                                   String requestBodyTemplate,
                                                   ApiResponse latest,
                                                   AiTestCaseGeneratorRequest request) {
        return "Endpoint details:\n"
                + "URL: " + endpointUrl + "\n"
                + "Method: " + endpointMethod + "\n"
                + "Headers: " + nullSafe(headers) + "\n"
            + "Headers override: " + nullSafe(request.requestHeadersTemplate()) + "\n"
            + "Query params template: " + nullSafe(request.queryParamsTemplate()) + "\n"
                + "Request body template: " + nullSafe(requestBodyTemplate) + "\n"
            + "Auth requirements: " + nullSafe(request.authRequirements()) + "\n"
            + "Success criteria: " + nullSafe(request.successCriteria()) + "\n"
            + "Failure criteria: " + nullSafe(request.failureCriteria()) + "\n"
            + "Required response fields/tokens: " + nullSafe(request.requiredResponseFields()) + "\n"
            + "Forbidden response fields/tokens: " + nullSafe(request.forbiddenResponseFields()) + "\n"
            + "Required JSON paths: " + nullSafe(request.requiredJsonPaths()) + "\n"
            + "Expected JSON path values (path=value): " + nullSafe(request.expectedJsonPathValues()) + "\n"
            + "Forbidden JSON path values (path=value): " + nullSafe(request.forbiddenJsonPathValues()) + "\n"
            + "Stable response keywords for contains assertion: " + nullSafe(request.stableResponseKeywords()) + "\n"
            + "Enforce keyword assertion: " + Boolean.TRUE.equals(request.enforceKeywordAssertion()) + "\n"
                + "Latest status: " + (latest == null ? "N/A" : latest.getStatusCode()) + "\n"
                + "Latest response time ms: " + (latest == null ? "N/A" : latest.getResponseTimeMs()) + "\n"
                + "Latest response body: " + (latest == null ? "N/A" : nullSafe(latest.getResponseBody())) + "\n"
            + "Additional context: " + nullSafe(request.additionalContext()) + "\n"
                + "Create tests tightly aligned with this endpoint and its body fields/params.";
    }

    private List<AiGeneratedTestCase> applyKeywordAssertionPolicy(List<AiGeneratedTestCase> generated,
                                                                  AiTestCaseGeneratorRequest request) {
        if (generated == null || generated.isEmpty()) {
            return List.of();
        }

        boolean enforce = Boolean.TRUE.equals(request.enforceKeywordAssertion());
        if (!enforce) {
            return stripExpectedKeyword(generated);
        }

        List<String> allowedKeywords = Arrays.stream(nullSafe(request.stableResponseKeywords()).split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .map(String::toLowerCase)
            .toList();

        if (allowedKeywords.isEmpty()) {
            return stripExpectedKeyword(generated);
        }

        return generated.stream()
            .map(item -> {
                String keyword = item.expectedKeyword();
                if (!StringUtils.hasText(keyword)) {
                    return item;
                }
                String normalized = keyword.trim().toLowerCase(Locale.ROOT);
                if (allowedKeywords.stream().anyMatch(allowed -> allowed.equals(normalized))) {
                    return item;
                }
                return withoutExpectedKeyword(item);
            })
            .toList();
    }

    private List<AiGeneratedTestCase> stripExpectedKeyword(List<AiGeneratedTestCase> generated) {
        return generated.stream()
            .map(this::withoutExpectedKeyword)
            .toList();
    }

    private AiGeneratedTestCase withoutExpectedKeyword(AiGeneratedTestCase item) {
        return new AiGeneratedTestCase(
            item.name(),
            item.description(),
            item.expectedStatusCode(),
            item.maxResponseTimeMs(),
            null,
            item.requiredResponseTokens(),
            item.forbiddenResponseTokens(),
            item.requiredJsonPaths(),
            item.expectedJsonPathValues(),
            item.forbiddenJsonPathValues(),
            item.category()
        );
    }

    private List<AiGeneratedTestCase> parseGeneratedTestCasesFromJson(String raw) {
        if (!StringUtils.hasText(raw)) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(extractLikelyJson(raw));
            JsonNode testCasesNode = root.path("testCases");
            if (!testCasesNode.isArray()) {
                return List.of();
            }

            List<AiGeneratedTestCase> parsed = new ArrayList<>();
            for (JsonNode node : testCasesNode) {
                String name = trimToLength(node.path("name").asText(""), 120);
                String description = trimToLength(node.path("description").asText(""), 350);
                int expectedStatus = node.path("expectedStatusCode").asInt(0);
                long maxResponseMs = node.path("maxResponseTimeMs").asLong(0);
                String expectedKeyword = trimToLength(node.path("expectedKeyword").asText(""), 255);
                String requiredResponseTokens = trimToLength(node.path("requiredResponseTokens").asText(""), 1200);
                String forbiddenResponseTokens = trimToLength(node.path("forbiddenResponseTokens").asText(""), 1200);
                String requiredJsonPaths = trimToLength(node.path("requiredJsonPaths").asText(""), 1200);
                String expectedJsonPathValues = trimToLength(node.path("expectedJsonPathValues").asText(""), 1800);
                String forbiddenJsonPathValues = trimToLength(node.path("forbiddenJsonPathValues").asText(""), 1800);
                String category = node.path("category").asText("").toUpperCase(Locale.ROOT);

                if (!StringUtils.hasText(name) || !StringUtils.hasText(description)) {
                    continue;
                }
                if (expectedStatus < 100 || expectedStatus > 599) {
                    continue;
                }
                if (maxResponseMs <= 0 || maxResponseMs > 60000) {
                    continue;
                }
                if (!VALID_TEST_CASE_CATEGORIES.contains(category)) {
                    continue;
                }

                parsed.add(new AiGeneratedTestCase(
                        name,
                        description,
                        expectedStatus,
                        maxResponseMs,
                        StringUtils.hasText(expectedKeyword) ? expectedKeyword : null,
                        StringUtils.hasText(requiredResponseTokens) ? requiredResponseTokens : null,
                        StringUtils.hasText(forbiddenResponseTokens) ? forbiddenResponseTokens : null,
                        StringUtils.hasText(requiredJsonPaths) ? requiredJsonPaths : null,
                        StringUtils.hasText(expectedJsonPathValues) ? expectedJsonPathValues : null,
                        StringUtils.hasText(forbiddenJsonPathValues) ? forbiddenJsonPathValues : null,
                        category
                ));
                if (parsed.size() >= 8) {
                    break;
                }
            }

            return parsed;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String extractLikelyJson(String raw) {
        int first = raw.indexOf('{');
        int last = raw.lastIndexOf('}');
        if (first >= 0 && last > first) {
            return raw.substring(first, last + 1);
        }
        return raw;
    }

    private List<AiGeneratedTestCase> buildDeterministicFallbackCases(String endpointLabel, String requestBodyTemplate) {
        return List.of(
                new AiGeneratedTestCase(
                        "Valid request for " + trimToLength(endpointLabel, 90),
                        "Send a valid payload matching the current template and verify successful processing for " + trimToLength(endpointLabel, 120),
                        200,
                        2000L,
                        null,
                        "status,success",
                        "password,stacktrace,exception",
                        "data.id,data.status",
                        "data.status=SUCCESS",
                        "error.code=INTERNAL",
                        "SUCCESS"
                ),
                new AiGeneratedTestCase(
                        "Missing required field validation",
                        "Remove one required field from request body template and verify validation error for endpoint " + trimToLength(endpointLabel, 120),
                        400,
                        2000L,
                        null,
                        "error,message",
                        "stacktrace,exception",
                        "error.code,error.message",
                        "error.code=VALIDATION",
                        "error.code=INTERNAL",
                        "FAILURE"
                ),
                new AiGeneratedTestCase(
                        "Malformed JSON body rejection",
                        "Send malformed JSON based on current body template and verify endpoint rejects invalid syntax safely",
                        400,
                        2000L,
                        null,
                        "error,message",
                        "stacktrace",
                        "error.message",
                        "error.type=INVALID_JSON",
                        "error.type=INTERNAL",
                        "FAILURE"
                ),
                new AiGeneratedTestCase(
                        "Unauthorized access protection",
                        "Call this endpoint without auth token and verify authorization guard is enforced",
                        401,
                        2000L,
                        null,
                        "error,message",
                        "stacktrace",
                        "error.code",
                        "error.code=UNAUTHORIZED",
                        "error.code=INTERNAL",
                        "FAILURE"
                ),
                new AiGeneratedTestCase(
                        "Latency edge on large payload",
                        "Use a larger variant of current request body and verify endpoint remains within accepted latency threshold",
                        200,
                        3500L,
                        null,
                        "status",
                        "stacktrace",
                        "data",
                        "status=SUCCESS",
                        "error.code=INTERNAL",
                        "EDGE"
                ),
                new AiGeneratedTestCase(
                        "Method mismatch handling",
                        "Invoke same URL with unsupported HTTP method and verify endpoint returns proper method error",
                        405,
                        2000L,
                        null,
                        "error",
                        "stacktrace",
                        "error.code",
                        "error.code=METHOD_NOT_ALLOWED",
                        "error.code=INTERNAL",
                        "EDGE"
                )
        );
    }

    private String trimToLength(String text, int maxLength) {
        String safe = nullSafe(text).trim();
        if (safe.length() <= maxLength) {
            return safe;
        }
        return safe.substring(0, maxLength);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    private ApiRequest getOwnedRequest(Long userId, Long apiRequestId) {
        return apiRequestRepository.findByIdAndUserId(apiRequestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("API request not found"));
    }

    private String extractSection(String text, String section, String fallback) {
        String safeText = nullSafe(text);
        String marker = section + ":";
        int start = safeText.indexOf(marker);
        if (start < 0) {
            start = safeText.indexOf(section + " -");
            if (start < 0) {
                return fallback;
            }
            marker = section + " -";
        }

        int contentStart = start + marker.length();
        int end = safeText.length();
        for (String nextSection : List.of("ROOT_CAUSE", "FIX", "OPTIMIZATION")) {
            if (nextSection.equals(section)) {
                continue;
            }
            int candidate = safeText.indexOf(nextSection + ":", contentStart);
            if (candidate > contentStart && candidate < end) {
                end = candidate;
            }
            int candidateDash = safeText.indexOf(nextSection + " -", contentStart);
            if (candidateDash > contentStart && candidateDash < end) {
                end = candidateDash;
            }
        }

        String value = safeText.substring(contentStart, end)
                .replaceAll("^[\\s\\-:]+", "")
                .replaceAll("\\n+", " ")
                .trim();
        return value.isBlank() ? fallback : value;
    }

    private Map<String, String> parseAnalysisJson(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(extractLikelyJson(raw));
            String rootCause = trimToLength(root.path("rootCause").asText(""), 600);
            String fixSuggestion = trimToLength(root.path("fixSuggestion").asText(""), 600);
            String optimizationRecommendation = trimToLength(root.path("optimizationRecommendation").asText(""), 600);

            if (!StringUtils.hasText(rootCause) && !StringUtils.hasText(fixSuggestion) && !StringUtils.hasText(optimizationRecommendation)) {
                return null;
            }

            return Map.of(
                    "rootCause", StringUtils.hasText(rootCause) ? rootCause : DEFAULT_ROOT_CAUSE,
                    "fixSuggestion", StringUtils.hasText(fixSuggestion) ? fixSuggestion : DEFAULT_FIX_SUGGESTION,
                    "optimizationRecommendation", StringUtils.hasText(optimizationRecommendation) ? optimizationRecommendation : DEFAULT_OPTIMIZATION
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private record TestGenerationSource(String endpointUrl,
                                        HttpMethodType endpointMethod,
                                        String requestBodyTemplate,
                                        String headers,
                                        ApiResponse latest) {
    }

    private record ParsedGeneration(List<AiGeneratedTestCase> generatedCases,
                                    String rawModelResponse) {
    }
}

