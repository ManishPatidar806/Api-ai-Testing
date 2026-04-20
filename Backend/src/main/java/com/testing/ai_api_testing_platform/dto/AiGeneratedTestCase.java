package com.testing.ai_api_testing_platform.dto;

import java.io.Serializable;

public record AiGeneratedTestCase(
        String name,
        String description,
        Integer expectedStatusCode,
        Long maxResponseTimeMs,
        String expectedKeyword,
        String requiredResponseTokens,
        String forbiddenResponseTokens,
        String requiredJsonPaths,
        String expectedJsonPathValues,
        String forbiddenJsonPathValues,
        String category
) implements Serializable {
        private static final long serialVersionUID = 1L;
}

