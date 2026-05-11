package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.response.AuthResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public interface AuthService {


    public User upsertFromGooglePayload(GoogleTokenVerifierServiceImpl.GoogleTokenPayload payload) ;


    public AuthResponse getCurrentUser(String email) ;

}
