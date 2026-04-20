package com.testing.ai_api_testing_platform.dto;

public record FailureRateResponse(
        Long apiRequestId,
        long totalExecutions,
        long failedExecutions,
        double failureRatePercentage
) {
}

