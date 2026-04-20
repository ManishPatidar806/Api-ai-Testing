package com.testing.ai_api_testing_platform.dto;

public record AiJobSubmissionResponse(
        String jobId,
        String status,
        String type
) {
}

