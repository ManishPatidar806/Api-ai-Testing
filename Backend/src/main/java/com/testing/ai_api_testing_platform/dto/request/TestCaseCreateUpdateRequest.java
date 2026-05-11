package com.testing.ai_api_testing_platform.dto.request;

import com.testing.ai_api_testing_platform.domain.enums.TestCaseMode;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record TestCaseCreateUpdateRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 1000) String description,
        @Min(100) @Max(599) Integer expectedStatusCode,
        @Positive Long maxResponseTimeMs,
        @Size(max = 255) String expectedKeyword,
        @Size(max = 1200) String requiredResponseTokens,
        @Size(max = 1200) String forbiddenResponseTokens,
        @Size(max = 1200) String requiredJsonPaths,
        @Size(max = 1800) String expectedJsonPathValues,
        @Size(max = 1800) String forbiddenJsonPathValues,
        Long setupApiRequestId,
        @Size(max = 300) String setupExtractJsonPath,
        @Size(max = 80) String setupVariableName,
        TestCaseMode testMode,
        @Min(1) @Max(500) Integer bruteForceAttempts,
        @Min(100) @Max(599) Integer bruteForceBlockStatusCode,
        @Min(1) @Max(500) Integer bruteForceStartBlockingAfter,
        @PositiveOrZero Long bruteForceDelayMs,
        Boolean active
) {
}

