package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.dto.response.AverageResponseTimeResponse;
import com.testing.ai_api_testing_platform.dto.response.FailureRateResponse;
import com.testing.ai_api_testing_platform.dto.response.SuccessRateResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
@Service
public interface GoogleTokenVerifierService {

    public GoogleTokenVerifierServiceImpl.GoogleTokenPayload verifyIdToken(String idToken);

        }
