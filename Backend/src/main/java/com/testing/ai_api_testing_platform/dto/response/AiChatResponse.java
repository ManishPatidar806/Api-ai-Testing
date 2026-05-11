package com.testing.ai_api_testing_platform.dto.response;

import java.io.Serializable;

public record AiChatResponse(
        String answer,
        String rawModelResponse
) implements Serializable {
        private static final long serialVersionUID = 1L;
}

