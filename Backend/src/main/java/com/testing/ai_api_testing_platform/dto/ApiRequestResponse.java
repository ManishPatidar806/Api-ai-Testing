package com.testing.ai_api_testing_platform.dto;

import com.testing.ai_api_testing_platform.domain.enums.HttpMethodType;

import java.time.Instant;
import java.util.Map;

public record ApiRequestResponse(
        Long id,
        String name,
        String url,
        HttpMethodType httpMethod,
        Map<String, String> headers,
        String requestBody,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}

