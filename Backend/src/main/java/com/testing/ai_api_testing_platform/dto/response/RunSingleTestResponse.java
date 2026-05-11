package com.testing.ai_api_testing_platform.dto.response;

public record RunSingleTestResponse(
        TestCaseResponse testCase,
        ApiResponseResponse apiResponse,
        TestResultResponse testResult
) {
}

