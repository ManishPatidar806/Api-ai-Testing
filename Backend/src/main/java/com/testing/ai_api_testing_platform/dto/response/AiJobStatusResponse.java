package com.testing.ai_api_testing_platform.dto.response;

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

