package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.response.AuthResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;

    public AuthServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User upsertFromGooglePayload(GoogleTokenVerifierServiceImpl.GoogleTokenPayload payload) {
        String email = payload.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(payload.name() == null || payload.name().isBlank() ? "Google User" : payload.name());
            newUser.setRole("USER");
            return newUser;
        });

        user.setGoogleId(payload.sub());
        if (payload.name() != null && !payload.name().isBlank()) {
            user.setName(payload.name().trim());
        }
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toAuthResponse(user);
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(
                true,
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                "GOOGLE"
        );
    }
}

