package com.testing.ai_api_testing_platform.dto;

public record AverageResponseTimeResponse(
        Long apiRequestId,
        long totalExecutions,
        double averageResponseTimeMs
) {
}

