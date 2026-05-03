package com.testing.ai_api_testing_platform.controller;

import com.testing.ai_api_testing_platform.dto.ApiRequestCreateUpdateRequest;
import com.testing.ai_api_testing_platform.dto.ApiRequestExecuteResponse;
import com.testing.ai_api_testing_platform.dto.ApiRequestResponse;
import com.testing.ai_api_testing_platform.dto.ApiResponseResponse;
import com.testing.ai_api_testing_platform.service.ApiRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/api-requests")
public class ApiRequestController {

    private final ApiRequestService apiRequestService;

    public ApiRequestController(ApiRequestService apiRequestService) {
        this.apiRequestService = apiRequestService;
    }

    @PostMapping
    public ResponseEntity<ApiRequestResponse> create(Authentication authentication,
                                                     @Valid @RequestBody ApiRequestCreateUpdateRequest request) {
        ApiRequestResponse response = apiRequestService.create(currentUser(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<ApiRequestResponse> listMine(Authentication authentication) {
        return apiRequestService.listMine(currentUser(authentication));
    }

    @GetMapping("/{requestId}")
    public ApiRequestResponse getMine(Authentication authentication, @PathVariable Long requestId) {
        return apiRequestService.getMine(currentUser(authentication), requestId);
    }

    @PutMapping("/{requestId}")
    public ApiRequestResponse updateMine(Authentication authentication,
                                         @PathVariable Long requestId,
                                         @Valid @RequestBody ApiRequestCreateUpdateRequest request) {
        return apiRequestService.updateMine(currentUser(authentication), requestId, request);
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<Void> deleteMine(Authentication authentication, @PathVariable Long requestId) {
        apiRequestService.deleteMine(currentUser(authentication), requestId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{requestId}/execute")
    public ApiRequestExecuteResponse executeMine(Authentication authentication, @PathVariable Long requestId) {
        return apiRequestService.executeMine(currentUser(authentication), requestId);
    }

    @GetMapping("/{requestId}/responses")
    public List<ApiResponseResponse> listRecentResponses(Authentication authentication, @PathVariable Long requestId) {
        return apiRequestService.listRecentResponses(currentUser(authentication), requestId);
    }

    private String currentUser(Authentication authentication) {
        return authentication.getName();
    }
}

