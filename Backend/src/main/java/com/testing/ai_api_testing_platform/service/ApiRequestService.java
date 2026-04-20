package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.ApiRequestCreateUpdateRequest;
import com.testing.ai_api_testing_platform.dto.ApiRequestExecuteResponse;
import com.testing.ai_api_testing_platform.dto.ApiRequestResponse;
import com.testing.ai_api_testing_platform.dto.ApiResponseResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.repository.ApiRequestRepository;
import com.testing.ai_api_testing_platform.repository.ApiResponseRepository;
import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ApiRequestService {

    private final ApiRequestRepository apiRequestRepository;
    private final ApiResponseRepository apiResponseRepository;
    private final UserRepository userRepository;
    private final ApiExecutionService apiExecutionService;

    public ApiRequestService(ApiRequestRepository apiRequestRepository,
                             ApiResponseRepository apiResponseRepository,
                             UserRepository userRepository,
                             ApiExecutionService apiExecutionService) {
        this.apiRequestRepository = apiRequestRepository;
        this.apiResponseRepository = apiResponseRepository;
        this.userRepository = userRepository;
        this.apiExecutionService = apiExecutionService;
    }

    @Transactional
    public ApiRequestResponse create(String email, ApiRequestCreateUpdateRequest request) {
        User user = getUserByEmail(email);

        ApiRequest entity = new ApiRequest();
        applyRequest(entity, request);
        entity.setUser(user);

        return toApiRequestResponse(apiRequestRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<ApiRequestResponse> listMine(String email) {
        User user = getUserByEmail(email);
        return apiRequestRepository.findByUserId(user.getId()).stream()
                .map(this::toApiRequestResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApiRequestResponse getMine(String email, Long requestId) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), requestId);
        return toApiRequestResponse(apiRequest);
    }

    @Transactional
    public ApiRequestResponse updateMine(String email, Long requestId, ApiRequestCreateUpdateRequest request) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), requestId);
        applyRequest(apiRequest, request);
        return toApiRequestResponse(apiRequestRepository.save(apiRequest));
    }

    @Transactional
    public void deleteMine(String email, Long requestId) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), requestId);
        apiRequestRepository.delete(apiRequest);
    }

    @Transactional
    public ApiRequestExecuteResponse executeMine(String email, Long requestId) {
        User user = getUserByEmail(email);
        ApiRequest apiRequest = getOwnedApiRequest(user.getId(), requestId);
        ApiResponse savedResponse = apiExecutionService.executeAndPersist(apiRequest);

        return new ApiRequestExecuteResponse(
                toApiRequestResponse(apiRequest),
                toApiResponseResponse(savedResponse)
        );
    }

    @Transactional(readOnly = true)
    public List<ApiResponseResponse> listRecentResponses(String email, Long requestId) {
        User user = getUserByEmail(email);
        getOwnedApiRequest(user.getId(), requestId);

        return apiResponseRepository.findTop20ByApiRequestIdAndApiRequestUserIdOrderByExecutedAtDesc(requestId, user.getId())
                .stream()
                .map(this::toApiResponseResponse)
                .toList();
    }

    private void applyRequest(ApiRequest entity, ApiRequestCreateUpdateRequest request) {
        entity.setName(request.name().trim());
        entity.setUrl(request.url().trim());
        entity.setHttpMethod(request.httpMethod());
        entity.setHeaders(request.headers() == null ? new HashMap<>() : new HashMap<>(request.headers()));
        entity.setRequestBody(request.requestBody());
        entity.setDescription(request.description());
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    private ApiRequest getOwnedApiRequest(Long userId, Long requestId) {
        return apiRequestRepository.findByIdAndUserId(requestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("API request not found"));
    }

    private ApiRequestResponse toApiRequestResponse(ApiRequest entity) {
        Map<String, String> headers = entity.getHeaders() == null
            ? Map.of()
            : new HashMap<>(entity.getHeaders());

        return new ApiRequestResponse(
                entity.getId(),
                entity.getName(),
                entity.getUrl(),
                entity.getHttpMethod(),
            headers,
                entity.getRequestBody(),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ApiResponseResponse toApiResponseResponse(ApiResponse entity) {
        return new ApiResponseResponse(
                entity.getId(),
                entity.getStatusCode(),
                entity.getResponseBody(),
            entity.getResponseHeaders(),
                entity.getResponseTimeMs(),
                entity.isSuccess(),
                entity.getErrorMessage(),
                entity.getExecutedAt()
        );
    }
}


