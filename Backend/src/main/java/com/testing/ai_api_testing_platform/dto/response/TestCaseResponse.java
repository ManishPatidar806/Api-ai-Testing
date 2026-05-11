package com.testing.ai_api_testing_platform.dto.response;

import com.testing.ai_api_testing_platform.domain.enums.TestCaseMode;

import java.time.Instant;

public record TestCaseResponse(
        Long id,
        Long apiRequestId,
        String name,
        String description,
        Integer expectedStatusCode,
        Long maxResponseTimeMs,
        String expectedKeyword,
        String requiredResponseTokens,
        String forbiddenResponseTokens,
        String requiredJsonPaths,
        String expectedJsonPathValues,
        String forbiddenJsonPathValues,
        Long setupApiRequestId,
        String setupExtractJsonPath,
        String setupVariableName,
        TestCaseMode testMode,
        Integer bruteForceAttempts,
        Integer bruteForceBlockStatusCode,
        Integer bruteForceStartBlockingAfter,
        Long bruteForceDelayMs,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}

