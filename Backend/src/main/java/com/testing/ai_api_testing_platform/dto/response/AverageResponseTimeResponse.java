package com.testing.ai_api_testing_platform.dto.response;

public record AverageResponseTimeResponse(
        Long apiRequestId,
        long totalExecutions,
        double averageResponseTimeMs
) {
}

