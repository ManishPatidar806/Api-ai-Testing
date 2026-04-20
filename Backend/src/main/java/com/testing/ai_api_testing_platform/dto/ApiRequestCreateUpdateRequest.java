package com.testing.ai_api_testing_platform.dto;

import com.testing.ai_api_testing_platform.domain.enums.HttpMethodType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record ApiRequestCreateUpdateRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 2048) String url,
        @NotNull HttpMethodType httpMethod,
        Map<String, String> headers,
        String requestBody,
        @Size(max = 1000) String description
) {
}

