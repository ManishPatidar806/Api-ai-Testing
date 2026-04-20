package com.testing.ai_api_testing_platform.dto;

import jakarta.validation.constraints.NotBlank;

public record AiChatRequest(
        Long apiRequestId,
        @NotBlank String message
) {
}

