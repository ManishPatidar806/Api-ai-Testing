package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.PerformanceMetric;
import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.AverageResponseTimeResponse;
import com.testing.ai_api_testing_platform.dto.FailureRateResponse;
import com.testing.ai_api_testing_platform.dto.PerformanceTrendSummaryResponse;
import com.testing.ai_api_testing_platform.dto.SuccessRateResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.repository.ApiRequestRepository;
import com.testing.ai_api_testing_platform.repository.PerformanceMetricRepository;
import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PerformanceAnalyticsService {

    private final UserRepository userRepository;
    private final ApiRequestRepository apiRequestRepository;
    private final PerformanceMetricRepository performanceMetricRepository;

    public PerformanceAnalyticsService(UserRepository userRepository,
                                       ApiRequestRepository apiRequestRepository,
                                       PerformanceMetricRepository performanceMetricRepository) {
        this.userRepository = userRepository;
        this.apiRequestRepository = apiRequestRepository;
        this.performanceMetricRepository = performanceMetricRepository;
    }

    @Transactional(readOnly = true)
    public AverageResponseTimeResponse getAverageResponseTime(String email, Long apiRequestId) {
        Long userId = validateOwnership(email, apiRequestId);
        long total = performanceMetricRepository.countByApiRequestIdAndApiRequestUserId(apiRequestId, userId);
        Double avg = performanceMetricRepository.findAverageResponseTimeByRequestAndUser(apiRequestId, userId);

        return new AverageResponseTimeResponse(apiRequestId, total, safe(avg));
    }

    @Transactional(readOnly = true)
    public SuccessRateResponse getSuccessRate(String email, Long apiRequestId) {
        Long userId = validateOwnership(email, apiRequestId);
        long total = performanceMetricRepository.countByApiRequestIdAndApiRequestUserId(apiRequestId, userId);
        long successful = performanceMetricRepository.countByApiRequestIdAndApiRequestUserIdAndSuccessfulTrue(apiRequestId, userId);

        double successRate = total == 0 ? 0.0 : (successful * 100.0) / total;
        return new SuccessRateResponse(apiRequestId, total, successful, round(successRate));
    }

    @Transactional(readOnly = true)
    public FailureRateResponse getFailureRate(String email, Long apiRequestId) {
        Long userId = validateOwnership(email, apiRequestId);
        long total = performanceMetricRepository.countByApiRequestIdAndApiRequestUserId(apiRequestId, userId);
        long successful = performanceMetricRepository.countByApiRequestIdAndApiRequestUserIdAndSuccessfulTrue(apiRequestId, userId);
        long failed = Math.max(0, total - successful);

        double failureRate = total == 0 ? 0.0 : (failed * 100.0) / total;
        return new FailureRateResponse(apiRequestId, total, failed, round(failureRate));
    }

    @Transactional(readOnly = true)
    public PerformanceTrendSummaryResponse getTrendSummary(String email, Long apiRequestId) {
        Long userId = validateOwnership(email, apiRequestId);
        long total = performanceMetricRepository.countByApiRequestIdAndApiRequestUserId(apiRequestId, userId);
        long successful = performanceMetricRepository.countByApiRequestIdAndApiRequestUserIdAndSuccessfulTrue(apiRequestId, userId);
        double overallAvg = safe(performanceMetricRepository.findAverageResponseTimeByRequestAndUser(apiRequestId, userId));

        List<PerformanceMetric> recent = performanceMetricRepository
                .findTop100ByApiRequestIdAndApiRequestUserIdOrderByRecordedAtDesc(apiRequestId, userId);

        double recentAvg = recent.stream()
                .limit(10)
                .mapToLong(PerformanceMetric::getResponseTimeMs)
                .average()
                .orElse(0.0);

        String trend;
        if (overallAvg == 0.0 || recentAvg == 0.0) {
            trend = "STABLE";
        } else if (recentAvg < overallAvg * 0.95) {
            trend = "IMPROVING";
        } else if (recentAvg > overallAvg * 1.05) {
            trend = "DEGRADING";
        } else {
            trend = "STABLE";
        }

        double successRate = total == 0 ? 0.0 : (successful * 100.0) / total;
        double failureRate = 100.0 - successRate;

        return new PerformanceTrendSummaryResponse(
                apiRequestId,
                total,
                round(overallAvg),
                round(recentAvg),
                round(successRate),
                round(failureRate),
                trend
        );
    }

    private Long validateOwnership(String email, Long apiRequestId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));

        ApiRequest apiRequest = apiRequestRepository.findByIdAndUserId(apiRequestId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("API request not found"));

        return apiRequest.getUser().getId();
    }

    private double safe(Double value) {
        return value == null ? 0.0 : round(value);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

