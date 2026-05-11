package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.dto.response.AverageResponseTimeResponse;
import com.testing.ai_api_testing_platform.dto.response.FailureRateResponse;
import com.testing.ai_api_testing_platform.dto.response.SuccessRateResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public interface PerformanceAnalyticsService {


    public AverageResponseTimeResponse getAverageResponseTime(String email, Long apiRequestId);
    public SuccessRateResponse getSuccessRate(String email, Long apiRequestId) ;
    public FailureRateResponse getFailureRate(String email, Long apiRequestId) ;

}
