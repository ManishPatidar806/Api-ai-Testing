package com.testing.ai_api_testing_platform.dto;

public record ReadinessCheckItemResponse(
        String key,
        String status,
        String message
) {
}
