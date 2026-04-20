package com.testing.ai_api_testing_platform.dto;

public record UserProfileResponse(
        Long id,
        String email,
        String name,
        String role
) {
}

