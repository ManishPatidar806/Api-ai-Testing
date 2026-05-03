package com.testing.ai_api_testing_platform.controller;

import com.testing.ai_api_testing_platform.dto.AverageResponseTimeResponse;
import com.testing.ai_api_testing_platform.dto.FailureRateResponse;
import com.testing.ai_api_testing_platform.dto.SuccessRateResponse;
import com.testing.ai_api_testing_platform.service.PerformanceAnalyticsService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/api-requests/{apiRequestId}/performance")
public class PerformanceAnalyticsController {

    private final PerformanceAnalyticsService performanceAnalyticsService;

    public PerformanceAnalyticsController(PerformanceAnalyticsService performanceAnalyticsService) {
        this.performanceAnalyticsService = performanceAnalyticsService;
    }

    @GetMapping("/average-response-time")
    public AverageResponseTimeResponse averageResponseTime(Authentication authentication, @PathVariable Long apiRequestId) {
        return performanceAnalyticsService.getAverageResponseTime(authentication.getName(), apiRequestId);
    }

    @GetMapping("/success-rate")
    public SuccessRateResponse successRate(Authentication authentication, @PathVariable Long apiRequestId) {
        return performanceAnalyticsService.getSuccessRate(authentication.getName(), apiRequestId);
    }

    @GetMapping("/failure-rate")
    public FailureRateResponse failureRate(Authentication authentication, @PathVariable Long apiRequestId) {
        return performanceAnalyticsService.getFailureRate(authentication.getName(), apiRequestId);
    }
}

