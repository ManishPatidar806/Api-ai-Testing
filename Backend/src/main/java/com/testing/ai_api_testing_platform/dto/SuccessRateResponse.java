package com.testing.ai_api_testing_platform.dto;

public record SuccessRateResponse(
        Long apiRequestId,
        long totalExecutions,
        long successfulExecutions,
        double successRatePercentage
) {
}

