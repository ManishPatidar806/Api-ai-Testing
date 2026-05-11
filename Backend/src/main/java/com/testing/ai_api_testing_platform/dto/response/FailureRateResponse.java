package com.testing.ai_api_testing_platform.dto.response;

public record FailureRateResponse(
        Long apiRequestId,
        long totalExecutions,
        long failedExecutions,
        double failureRatePercentage
) {
}

