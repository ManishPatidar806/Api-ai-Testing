package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
@Service
public interface ApiExecutionService {


    public ApiResponse executeAndPersist(ApiRequest apiRequest) ;


    public ApiResponse executeAndPersist(ApiRequest apiRequest,
                                         String overrideUrl,
                                         Map<String, String> overrideHeaders,
                                         String overrideRequestBody) ;

}
