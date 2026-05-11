package com.testing.ai_api_testing_platform.dto.request;

import jakarta.validation.constraints.NotNull;

public record AiErrorAnalysisRequest(
        @NotNull Long apiRequestId,
        String errorMessage
) {
}

