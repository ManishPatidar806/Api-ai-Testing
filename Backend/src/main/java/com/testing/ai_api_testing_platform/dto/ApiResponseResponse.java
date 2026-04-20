package com.testing.ai_api_testing_platform.dto;

import java.time.Instant;

public record ApiResponseResponse(
        Long id,
        Integer statusCode,
        String responseBody,
        String responseHeaders,
        Long responseTimeMs,
        boolean success,
        String errorMessage,
        Instant executedAt
) {
}

