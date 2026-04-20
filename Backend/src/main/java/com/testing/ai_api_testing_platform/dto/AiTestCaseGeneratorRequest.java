package com.testing.ai_api_testing_platform.dto;

import com.testing.ai_api_testing_platform.domain.enums.HttpMethodType;
import jakarta.validation.constraints.Size;

public record AiTestCaseGeneratorRequest(
        Long apiRequestId,
        @Size(max = 2048) String endpointUrl,
        HttpMethodType endpointMethod,
        String requestBodyTemplate,
        @Size(max = 4000) String requestHeadersTemplate,
        @Size(max = 2000) String queryParamsTemplate,
        @Size(max = 1000) String authRequirements,
        @Size(max = 1200) String successCriteria,
        @Size(max = 1200) String failureCriteria,
        @Size(max = 1200) String requiredResponseFields,
        @Size(max = 1200) String forbiddenResponseFields,
        @Size(max = 1200) String requiredJsonPaths,
        @Size(max = 1800) String expectedJsonPathValues,
        @Size(max = 1800) String forbiddenJsonPathValues,
        @Size(max = 1200) String stableResponseKeywords,
        Boolean enforceKeywordAssertion,
        String additionalContext,
        Boolean strictMode
) {
}

