package com.testing.ai_api_testing_platform.controller;

import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.UserProfileResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserProfileResponse me(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return new UserProfileResponse(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }
}

