package com.testing.ai_api_testing_platform.dto.response;

public record ApiRequestExecuteResponse(
        ApiRequestResponse apiRequest,
        ApiResponseResponse apiResponse
) {
}

