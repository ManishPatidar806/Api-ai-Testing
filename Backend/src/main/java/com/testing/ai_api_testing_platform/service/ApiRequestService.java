package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.request.ApiRequestCreateUpdateRequest;
import com.testing.ai_api_testing_platform.dto.response.ApiRequestExecuteResponse;
import com.testing.ai_api_testing_platform.dto.response.ApiRequestResponse;
import com.testing.ai_api_testing_platform.dto.response.ApiResponseResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
@Service
public interface ApiRequestService {
    public ApiRequestResponse create(String email, ApiRequestCreateUpdateRequest request) ;
    public List<ApiRequestResponse> listMine(String email) ;
    public ApiRequestResponse getMine(String email, Long requestId);
    public ApiRequestResponse updateMine(String email, Long requestId, ApiRequestCreateUpdateRequest request) ;
    public void deleteMine(String email, Long requestId);
    public ApiRequestExecuteResponse executeMine(String email, Long requestId) ;
    public List<ApiResponseResponse> listRecentResponses(String email, Long requestId);
}
