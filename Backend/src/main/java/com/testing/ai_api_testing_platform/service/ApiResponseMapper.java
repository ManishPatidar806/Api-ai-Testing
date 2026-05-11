package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.dto.response.ApiResponseResponse;
import org.springframework.stereotype.Service;

@Service
public interface ApiResponseMapper {
    public ApiResponseResponse toResponse(ApiResponse entity);
}
