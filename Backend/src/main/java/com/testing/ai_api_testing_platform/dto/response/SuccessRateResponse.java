package com.testing.ai_api_testing_platform.dto.response;

public record SuccessRateResponse(
        Long apiRequestId,
        long totalExecutions,
        long successfulExecutions,
        double successRatePercentage
) {
}

