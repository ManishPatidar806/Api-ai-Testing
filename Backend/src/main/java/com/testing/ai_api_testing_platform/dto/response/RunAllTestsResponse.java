package com.testing.ai_api_testing_platform.dto.response;

import java.util.List;

public record RunAllTestsResponse(
        Long apiRequestId,
        ApiResponseResponse apiResponse,
        int total,
        int passed,
        int failed,
        List<TestResultResponse> results
) {
}

