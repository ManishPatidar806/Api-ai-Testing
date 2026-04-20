package com.testing.ai_api_testing_platform.dto;

import java.time.Instant;

public record AiJobStatusResponse(
        String jobId,
        String status,
        String type,
        Object result,
        String error,
        Instant updatedAt
) {
}

