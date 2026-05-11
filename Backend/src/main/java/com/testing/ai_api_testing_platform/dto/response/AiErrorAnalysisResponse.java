package com.testing.ai_api_testing_platform.dto.response;

import java.io.Serializable;

public record AiErrorAnalysisResponse(
        String rootCause,
        String fixSuggestion,
        String optimizationRecommendation,
        String rawModelResponse
) implements Serializable {
        private static final long serialVersionUID = 1L;
}

