package com.testing.ai_api_testing_platform.dto.response;

import com.testing.ai_api_testing_platform.domain.enums.TestExecutionStatus;

import java.time.Instant;

public record TestResultResponse(
        Long id,
        Long testCaseId,
        Long apiResponseId,
        TestExecutionStatus status,
        Integer actualStatusCode,
        Long actualResponseTimeMs,
        Boolean keywordMatched,
        String assertionMessage,
        Instant executedAt
) {
}

