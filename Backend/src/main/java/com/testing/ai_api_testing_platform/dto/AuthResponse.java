package com.testing.ai_api_testing_platform.dto;

public record AuthResponse(
        boolean authenticated,
        Long userId,
        String email,
        String name,
        String role,
        String authProvider
) {
}

