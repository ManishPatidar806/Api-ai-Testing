package com.testing.ai_api_testing_platform.dto.response;

public record AiJobSubmissionResponse(
        String jobId,
        String status,
        String type
) {
}

