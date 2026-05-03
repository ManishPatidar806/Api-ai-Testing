package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.dto.ApiResponseResponse;
import org.springframework.stereotype.Component;

@Component
public class ApiResponseMapper {

    public ApiResponseResponse toResponse(ApiResponse entity) {
        if (entity == null) {
            return null;
        }

        return new ApiResponseResponse(
            entity.getId(),
            entity.getStatusCode(),
            entity.getResponseBody(),
            entity.getResponseHeaders(),
            entity.getResponseTimeMs(),
            entity.isSuccess(),
            entity.getErrorMessage(),
            entity.getExecutedAt()
        );
    }
}

