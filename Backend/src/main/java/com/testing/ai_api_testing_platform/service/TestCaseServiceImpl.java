package com.testing.ai_api_testing_platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.domain.entity.TestCase;
import com.testing.ai_api_testing_platform.domain.entity.TestResult;
import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.domain.enums.TestCaseMode;
import com.testing.ai_api_testing_platform.domain.enums.TestExecutionStatus;
import com.testing.ai_api_testing_platform.dto.response.RunAllTestsResponse;
import com.testing.ai_api_testing_platform.dto.response.RunSingleTestResponse;
import com.testing.ai_api_testing_platform.dto.request.TestCaseCreateUpdateRequest;
import com.testing.ai_api_testing_platform.dto.response.TestCaseResponse;
import com.testing.ai_api_testing_platform.dto.response.TestResultResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.repository.ApiRequestRepository;
import com.testing.ai_api_testing_platform.repository.TestCaseRepository;
import com.testing.ai_api_testing_platform.repository.TestResultRepository;
import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class TestCaseServiceImpl implements TestCaseService{

    private static final int DEFAULT_BRUTE_FORCE_ATTEMPTS = 10;
    private static final int MAX_BRUTE_FORCE_ATTEMPTS = 500;
    private static final int DEFAULT_BLOCK_STATUS = 429;

    private final UserRepository userRepository;
    private final ApiRequestRepository apiRequestRepository;
    private final TestCaseRepository testCaseRepository;
    private final TestResultRepository testResultRepository;
    private final ApiExecutionServiceImpl apiExecutionServiceImpl;
    private final ApiResponseMapperImpl apiResponseMapperImpl;
    private final ObjectMapper objectMapper;

    public TestCaseServiceImpl(UserRepository userRepository,
                               ApiRequestRepository apiRequestRepository,
                               TestCaseRepository testCaseRepository,
                               TestResultRepository testResultRepository,
                               ApiExecutionServiceImpl apiExecutionServiceImpl,
                               ApiResponseMapperImpl apiResponseMapperImpl,
                               ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.apiRequestRepository = apiRequestRepository;
        this.testCaseRepository = testCaseRepository;
        this.testResultRepository = testResultRepository;
        this.apiExecutionServiceImpl = apiExecutionServiceImpl;
        this.apiResponseMapperImpl = apiResponseMapperImpl;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TestCaseResponse create(String email, Long apiRequestId, TestCaseCreateUpdateRequest request) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), apiRequestId);

        TestCase testCase = new TestCase();
        testCase.setApiRequest(apiRequest);
        applyTestCaseUpdate(testCase, request, true);

        return toTestCaseResponse(testCaseRepository.save(testCase));
    }

    @Transactional(readOnly = true)
    public List<TestCaseResponse> list(String email, Long apiRequestId) {
        User user = getUserByEmail(email);
        getOwnedApiRequest(user.getId(), apiRequestId);

        return testCaseRepository.findByApiRequestIdAndApiRequestUserId(apiRequestId, user.getId())
                .stream()
                .map(this::toTestCaseResponse)
                .toList();
    }

    @Transactional
    public void delete(String email, Long apiRequestId, Long testCaseId) {
        User user = getUserByEmail(email);
        TestCase testCase = getOwnedTestCase(user.getId(), apiRequestId, testCaseId);
        testCase.setActive(false);
        testCaseRepository.save(testCase);
    }

    @Transactional
    public RunSingleTestResponse runSingle(String email, Long apiRequestId, Long testCaseId) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), apiRequestId);
        TestCase testCase = getOwnedTestCase(user.getId(), apiRequestId, testCaseId);

        TestResult testResult = executeAndEvaluate(user.getId(), apiRequest, testCase);
        ApiResponse apiResponse = testResult.getApiResponse();

        return new RunSingleTestResponse(
                toTestCaseResponse(testCase),
                apiResponseMapperImpl.toResponse(apiResponse),
                toTestResultResponse(testResult)
        );
    }

    @Transactional
    public RunAllTestsResponse runAll(String email, Long apiRequestId) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), apiRequestId);

        List<TestCase> activeCases = testCaseRepository.findByApiRequestIdAndApiRequestUserIdAndActiveTrue(apiRequestId, user.getId());
        if (activeCases.isEmpty()) {
            return new RunAllTestsResponse(
                    apiRequestId,
                    null,
                    0,
                    0,
                    0,
                    List.of()
            );
        }

        List<TestResultResponse> resultResponses = new ArrayList<>();
        int passed = 0;
        ApiResponse lastApiResponse = null;

        for (TestCase testCase : activeCases) {
            TestResult result = runAndPersistByMode(user.getId(), apiRequest, testCase);

            lastApiResponse = result.getApiResponse();
            if (result.getStatus() == TestExecutionStatus.PASS) {
                passed++;
            }
            resultResponses.add(toTestResultResponse(result));
        }

        int failed = activeCases.size() - passed;
        return new RunAllTestsResponse(
                apiRequestId,
                apiResponseMapperImpl.toResponse(lastApiResponse),
                activeCases.size(),
                passed,
                failed,
                resultResponses
        );
    }

    @Transactional(readOnly = true)
    public List<TestResultResponse> listRecentResults(String email, Long apiRequestId) {
        User user = getUserByEmail(email);
        getOwnedApiRequest(user.getId(), apiRequestId);

        return testResultRepository.findTop100ByTestCaseApiRequestIdAndTestCaseApiRequestUserIdOrderByExecutedAtDesc(
                        apiRequestId,
                        user.getId()
                ).stream()
                .map(this::toTestResultResponse)
                .toList();
    }

    private TestResult executeAndEvaluate(Long userId, ApiRequest apiRequest, TestCase testCase) {
        return runAndPersistByMode(userId, apiRequest, testCase);
    }

    private TestResult runAndPersistByMode(Long userId, ApiRequest apiRequest, TestCase testCase) {
        if (testCase.getTestMode() == TestCaseMode.BRUTE_FORCE) {
            return runBruteForceAndPersist(userId, apiRequest, testCase);
        }
        return evaluateFunctionalAndPersist(userId, apiRequest, testCase);
    }

    private TestResult evaluateFunctionalAndPersist(Long userId, ApiRequest apiRequest, TestCase testCase) {
        ExecutionContext context = prepareExecutionContext(userId, apiRequest, testCase);
        if (!context.ready()) {
            return buildSetupFailureResult(apiRequest, testCase, context);
        }

        ApiResponse apiResponse = apiExecutionServiceImpl.executeAndPersist(
                apiRequest,
                context.url(),
                context.headers(),
                context.body()
        );

        List<String> failures = new ArrayList<>();
        Boolean keywordMatched = evaluateCommonAssertions(testCase, apiResponse, failures);

        return saveTestResult(testCase, apiResponse, failures, keywordMatched, failures.isEmpty());
    }

    private TestResult runBruteForceAndPersist(Long userId, ApiRequest apiRequest, TestCase testCase) {
        int attempts = normalizeAttempts(testCase.getBruteForceAttempts());
        int expectedBlockStatus = testCase.getBruteForceBlockStatusCode() == null ? DEFAULT_BLOCK_STATUS : testCase.getBruteForceBlockStatusCode();
        int expectedBlockByAttempt = testCase.getBruteForceStartBlockingAfter() == null ? attempts : testCase.getBruteForceStartBlockingAfter();
        expectedBlockByAttempt = Math.max(1, Math.min(expectedBlockByAttempt, attempts));
        long delayMs = testCase.getBruteForceDelayMs() == null ? 0L : Math.max(0L, testCase.getBruteForceDelayMs());

        ExecutionContext context = prepareExecutionContext(userId, apiRequest, testCase);
        if (!context.ready()) {
            return buildSetupFailureResult(apiRequest, testCase, context);
        }

        ApiResponse lastResponse = null;
        Integer firstBlockedAttempt = null;

        for (int attempt = 1; attempt <= attempts; attempt++) {
            ApiResponse current = apiExecutionServiceImpl.executeAndPersist(
                    apiRequest,
                    context.url(),
                    context.headers(),
                    context.body()
            );
            lastResponse = current;

            if (Objects.equals(current.getStatusCode(), expectedBlockStatus) && firstBlockedAttempt == null) {
                firstBlockedAttempt = attempt;
            }

            if (delayMs > 0 && attempt < attempts) {
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        if (lastResponse == null) {
            throw new IllegalStateException("Brute-force execution did not produce any API response");
        }

        List<String> failures = new ArrayList<>();
        Boolean keywordMatched = evaluateCommonAssertions(testCase, lastResponse, failures);

        if (firstBlockedAttempt == null) {
            failures.add("Expected rate-limit status " + expectedBlockStatus + " within " + attempts + " attempts but it never occurred");
        } else if (firstBlockedAttempt > expectedBlockByAttempt) {
            failures.add("Expected rate-limit status " + expectedBlockStatus + " by attempt " + expectedBlockByAttempt
                    + " but first block happened at attempt " + firstBlockedAttempt);
        }

        if (failures.isEmpty()) {
            String summary = "Brute-force simulation passed. First block detected at attempt " + firstBlockedAttempt
                    + " with status " + expectedBlockStatus;
            return saveTestResult(testCase, lastResponse, List.of(summary), keywordMatched, true);
        }

        failures.add("Brute-force simulation failed");
        return saveTestResult(testCase, lastResponse, failures, keywordMatched, false);
    }

    private Boolean evaluateCommonAssertions(TestCase testCase, ApiResponse apiResponse, List<String> failures) {
        if (testCase.getExpectedStatusCode() != null && !testCase.getExpectedStatusCode().equals(apiResponse.getStatusCode())) {
            failures.add("Expected status " + testCase.getExpectedStatusCode() + " but got " + apiResponse.getStatusCode());
        }

        if (testCase.getMaxResponseTimeMs() != null && apiResponse.getResponseTimeMs() > testCase.getMaxResponseTimeMs()) {
            failures.add("Expected response time <= " + testCase.getMaxResponseTimeMs() + " ms but got " + apiResponse.getResponseTimeMs() + " ms");
        }

        Boolean keywordMatched = null;
        String responseBody = apiResponse.getResponseBody() == null ? "" : apiResponse.getResponseBody();
        JsonNode responseJson = tryParseJson(responseBody);
        if (StringUtils.hasText(testCase.getExpectedKeyword())) {
            keywordMatched = responseBody.contains(testCase.getExpectedKeyword());
            if (!keywordMatched) {
                failures.add("Expected response to contain keyword: " + testCase.getExpectedKeyword());
            }
        }

        for (String token : splitTokens(testCase.getRequiredResponseTokens())) {
            if (!containsToken(responseBody, responseJson, token)) {
                failures.add("Expected response to include required token: " + token);
            }
        }

        for (String token : splitTokens(testCase.getForbiddenResponseTokens())) {
            if (containsToken(responseBody, responseJson, token)) {
                failures.add("Expected response to exclude forbidden token: " + token);
            }
        }

        for (String path : splitTokens(testCase.getRequiredJsonPaths())) {
            JsonNode node = resolveJsonPath(responseJson, path);
            if (node == null || node.isMissingNode() || node.isNull()) {
                failures.add("Expected JSON path to exist: " + path);
            }
        }

        for (Map.Entry<String, String> rule : splitPathValueRules(testCase.getExpectedJsonPathValues()).entrySet()) {
            JsonNode node = resolveJsonPath(responseJson, rule.getKey());
            if (node == null || node.isMissingNode() || node.isNull()) {
                failures.add("Expected JSON path for equals assertion is missing: " + rule.getKey());
                continue;
            }
            String actual = jsonNodeAsComparableText(node);
            if (!Objects.equals(actual, rule.getValue())) {
                failures.add("Expected JSON path " + rule.getKey() + " == " + rule.getValue() + " but got " + actual);
            }
        }

        for (Map.Entry<String, String> rule : splitPathValueRules(testCase.getForbiddenJsonPathValues()).entrySet()) {
            JsonNode node = resolveJsonPath(responseJson, rule.getKey());
            if (node == null || node.isMissingNode() || node.isNull()) {
                continue;
            }
            String actual = jsonNodeAsComparableText(node);
            if (Objects.equals(actual, rule.getValue())) {
                failures.add("Expected JSON path " + rule.getKey() + " != " + rule.getValue() + " but got " + actual);
            }
        }

        return keywordMatched;
    }

    private List<String> splitTokens(String raw) {
        if (!StringUtils.hasText(raw)) {
            return List.of();
        }

        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }

    private JsonNode tryParseJson(String body) {
        if (!StringUtils.hasText(body)) {
            return null;
        }

        try {
            return objectMapper.readTree(body);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Map<String, String> splitPathValueRules(String raw) {
        if (!StringUtils.hasText(raw)) {
            return Map.of();
        }

        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(rule -> rule.split("=", 2))
                .filter(parts -> parts.length == 2)
                .collect(Collectors.toMap(
                        parts -> parts[0].trim(),
                        parts -> parts[1].trim(),
                        (first, second) -> second
                ));
    }

    private JsonNode resolveJsonPath(JsonNode root, String path) {
        if (root == null || !StringUtils.hasText(path)) {
            return null;
        }

        JsonNode cursor = root;
        for (String segment : path.split("\\.")) {
            String clean = segment.trim();
            if (!StringUtils.hasText(clean)) {
                return null;
            }

            if (cursor.isArray()) {
                if (!clean.matches("\\d+")) {
                    return null;
                }
                int index = Integer.parseInt(clean);
                if (index < 0 || index >= cursor.size()) {
                    return null;
                }
                cursor = cursor.get(index);
                continue;
            }

            if (!cursor.has(clean)) {
                return null;
            }
            cursor = cursor.get(clean);
        }

        return cursor;
    }

    private String jsonNodeAsComparableText(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isTextual() || node.isNumber() || node.isBoolean()) {
            return node.asText();
        }
        return node.toString();
    }

    private boolean containsToken(String responseBody, JsonNode json, String token) {
        if (!StringUtils.hasText(token)) {
            return false;
        }

        if (StringUtils.hasText(responseBody) && responseBody.contains(token)) {
            return true;
        }

        if (json == null) {
            return false;
        }

        if (token.contains(".")) {
            JsonNode cursor = json;
            for (String segment : token.split("\\.")) {
                if (cursor == null || !cursor.has(segment)) {
                    return false;
                }
                cursor = cursor.get(segment);
            }
            return cursor != null && !cursor.isMissingNode() && !cursor.isNull();
        }

        return json.has(token);
    }

    private int normalizeAttempts(Integer attempts) {
        if (attempts == null) {
            return DEFAULT_BRUTE_FORCE_ATTEMPTS;
        }
        return Math.max(1, Math.min(attempts, MAX_BRUTE_FORCE_ATTEMPTS));
    }

    private TestResult buildSetupFailureResult(ApiRequest apiRequest, TestCase testCase, ExecutionContext context) {
        ApiResponse setupResponse = context.setupResponse() != null
            ? context.setupResponse()
            : apiExecutionServiceImpl.executeAndPersist(apiRequest);
        return saveTestResult(testCase, setupResponse, List.of(context.errorMessage()), null, false);
    }

    private ExecutionContext prepareExecutionContext(Long userId, ApiRequest apiRequest, TestCase testCase) {
        String url = apiRequest.getUrl();
        String body = apiRequest.getRequestBody();
        Map<String, String> headers = apiRequest.getHeaders() == null ? new HashMap<>() : new HashMap<>(apiRequest.getHeaders());

        if (testCase.getSetupApiRequestId() == null) {
            return ExecutionContext.ready(url, body, headers, null);
        }

        ApiRequest setupRequest;
        try {
            setupRequest = getOwnedApiRequest(userId, testCase.getSetupApiRequestId());
        } catch (ResourceNotFoundException ex) {
            return ExecutionContext.error("Setup API request not found for this user", null);
        }

        ApiResponse setupResponse = apiExecutionServiceImpl.executeAndPersist(setupRequest);
        if (!setupResponse.isSuccess()) {
            return ExecutionContext.error(
                    "Setup request failed with status " + setupResponse.getStatusCode() + ". Fix setup endpoint/test data first.",
                    setupResponse
            );
        }

        String extractPath = StringUtils.hasText(testCase.getSetupExtractJsonPath())
                ? testCase.getSetupExtractJsonPath().trim()
                : "id";
        String variableName = StringUtils.hasText(testCase.getSetupVariableName())
                ? testCase.getSetupVariableName().trim()
                : "setupValue";

        JsonNode setupJson = tryParseJson(setupResponse.getResponseBody());
        JsonNode extracted = resolveJsonPath(setupJson, extractPath);
        if (extracted == null || extracted.isMissingNode() || extracted.isNull()) {
            return ExecutionContext.error(
                    "Setup value extraction failed. Path not found: " + extractPath,
                    setupResponse
            );
        }

        String extractedValue = jsonNodeAsComparableText(extracted);
        Map<String, String> variables = new HashMap<>();
        variables.put(variableName, extractedValue == null ? "" : extractedValue);
        variables.put("setupValue", extractedValue == null ? "" : extractedValue);

        String resolvedUrl = replaceVariables(url, variables);
        String resolvedBody = replaceVariables(body, variables);
        Map<String, String> resolvedHeaders = new HashMap<>();
        headers.forEach((key, value) -> resolvedHeaders.put(key, replaceVariables(value, variables)));

        return ExecutionContext.ready(resolvedUrl, resolvedBody, resolvedHeaders, setupResponse);
    }

    private String replaceVariables(String source, Map<String, String> variables) {
        if (!StringUtils.hasText(source) || variables == null || variables.isEmpty()) {
            return source;
        }

        String resolved = source;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            resolved = resolved.replace("{{" + entry.getKey() + "}}", entry.getValue() == null ? "" : entry.getValue());
        }
        return resolved;
    }

    private TestResult saveTestResult(TestCase testCase,
                                      ApiResponse apiResponse,
                                      List<String> messages,
                                      Boolean keywordMatched,
                                      boolean passed) {
        TestResult result = new TestResult();
        result.setTestCase(testCase);
        result.setApiResponse(apiResponse);
        result.setStatus(passed ? TestExecutionStatus.PASS : TestExecutionStatus.FAIL);
        result.setActualStatusCode(apiResponse.getStatusCode());
        result.setActualResponseTimeMs(apiResponse.getResponseTimeMs());
        result.setKeywordMatched(keywordMatched);
        if (messages == null || messages.isEmpty()) {
            result.setAssertionMessage("All configured assertions passed");
        } else {
            result.setAssertionMessage(String.join("; ", messages));
        }
        result.setExecutedAt(Instant.now());

        return testResultRepository.save(result);
    }

    private void applyTestCaseUpdate(TestCase testCase, TestCaseCreateUpdateRequest request, boolean applyDefaultActive) {
        testCase.setName(request.name().trim());
        testCase.setDescription(request.description());
        testCase.setExpectedStatusCode(request.expectedStatusCode());
        testCase.setMaxResponseTimeMs(request.maxResponseTimeMs());
        testCase.setExpectedKeyword(request.expectedKeyword());
        testCase.setRequiredResponseTokens(request.requiredResponseTokens());
        testCase.setForbiddenResponseTokens(request.forbiddenResponseTokens());
        testCase.setRequiredJsonPaths(request.requiredJsonPaths());
        testCase.setExpectedJsonPathValues(request.expectedJsonPathValues());
        testCase.setForbiddenJsonPathValues(request.forbiddenJsonPathValues());
        testCase.setSetupApiRequestId(request.setupApiRequestId());
        testCase.setSetupExtractJsonPath(request.setupExtractJsonPath());
        testCase.setSetupVariableName(request.setupVariableName());
        testCase.setTestMode(request.testMode() == null ? TestCaseMode.FUNCTIONAL : request.testMode());
        testCase.setBruteForceAttempts(request.bruteForceAttempts());
        testCase.setBruteForceBlockStatusCode(request.bruteForceBlockStatusCode());
        testCase.setBruteForceStartBlockingAfter(request.bruteForceStartBlockingAfter());
        testCase.setBruteForceDelayMs(request.bruteForceDelayMs());

        if (request.active() != null) {
            testCase.setActive(request.active());
        } else if (applyDefaultActive) {
            testCase.setActive(true);
        }
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    private ApiRequest getOwnedApiRequest(Long userId, Long apiRequestId) {
        return apiRequestRepository.findByIdAndUserId(apiRequestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("API request not found"));
    }

    private TestCase getOwnedTestCase(Long userId, Long apiRequestId, Long testCaseId) {
        return testCaseRepository.findByIdAndApiRequestIdAndApiRequestUserId(testCaseId, apiRequestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Test case not found"));
    }

    private TestCaseResponse toTestCaseResponse(TestCase entity) {
        return new TestCaseResponse(
                entity.getId(),
                entity.getApiRequest().getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getExpectedStatusCode(),
                entity.getMaxResponseTimeMs(),
                entity.getExpectedKeyword(),
                entity.getRequiredResponseTokens(),
                entity.getForbiddenResponseTokens(),
                entity.getRequiredJsonPaths(),
                entity.getExpectedJsonPathValues(),
                entity.getForbiddenJsonPathValues(),
                entity.getSetupApiRequestId(),
                entity.getSetupExtractJsonPath(),
                entity.getSetupVariableName(),
                entity.getTestMode(),
                entity.getBruteForceAttempts(),
                entity.getBruteForceBlockStatusCode(),
                entity.getBruteForceStartBlockingAfter(),
                entity.getBruteForceDelayMs(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private TestResultResponse toTestResultResponse(TestResult entity) {
        return new TestResultResponse(
                entity.getId(),
                entity.getTestCase().getId(),
                entity.getApiResponse() == null ? null : entity.getApiResponse().getId(),
                entity.getStatus(),
                entity.getActualStatusCode(),
                entity.getActualResponseTimeMs(),
                entity.getKeywordMatched(),
                entity.getAssertionMessage(),
                entity.getExecutedAt()
        );
    }

    private record ExecutionContext(String url,
                                    String body,
                                    Map<String, String> headers,
                                    boolean ready,
                                    String errorMessage,
                                    ApiResponse setupResponse) {
        private static ExecutionContext ready(String url, String body, Map<String, String> headers, ApiResponse setupResponse) {
            return new ExecutionContext(url, body, headers, true, null, setupResponse);
        }

        private static ExecutionContext error(String message, ApiResponse setupResponse) {
            return new ExecutionContext(null, null, null, false, message, setupResponse);
        }
    }
}

