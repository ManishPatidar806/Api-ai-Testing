package com.testing.ai_api_testing_platform.dto.response;

public record ReadinessCheckItemResponse(
        String key,
        String status,
        String message
) {
}
