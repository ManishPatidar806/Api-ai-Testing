package com.testing.ai_api_testing_platform.dto;

import java.io.Serializable;
import java.util.List;

public record AiTestCaseGeneratorResponse(
        List<AiGeneratedTestCase> testCases,
        String rawModelResponse
) implements Serializable {
        private static final long serialVersionUID = 1L;
}

