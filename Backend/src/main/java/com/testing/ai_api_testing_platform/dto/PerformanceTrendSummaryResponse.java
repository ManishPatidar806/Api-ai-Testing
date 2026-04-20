package com.testing.ai_api_testing_platform.dto;

public record PerformanceTrendSummaryResponse(
        Long apiRequestId,
        long totalExecutions,
        double averageResponseTimeMs,
        double recentAverageResponseTimeMs,
        double successRatePercentage,
        double failureRatePercentage,
        String latencyTrend
) {
}

