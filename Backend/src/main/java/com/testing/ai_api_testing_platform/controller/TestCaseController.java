package com.testing.ai_api_testing_platform.controller;

import com.testing.ai_api_testing_platform.dto.RunAllTestsResponse;
import com.testing.ai_api_testing_platform.dto.RunSingleTestResponse;
import com.testing.ai_api_testing_platform.dto.TestCaseCreateUpdateRequest;
import com.testing.ai_api_testing_platform.dto.TestCaseResponse;
import com.testing.ai_api_testing_platform.dto.TestResultResponse;
import com.testing.ai_api_testing_platform.service.TestCaseService;
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
@RequestMapping("/api/v1/api-requests/{apiRequestId}")
public class TestCaseController {

    private final TestCaseService testCaseService;

    public TestCaseController(TestCaseService testCaseService) {
        this.testCaseService = testCaseService;
    }

    @PostMapping("/test-cases")
    public ResponseEntity<TestCaseResponse> create(Authentication authentication,
                                                   @PathVariable Long apiRequestId,
                                                   @Valid @RequestBody TestCaseCreateUpdateRequest request) {
        TestCaseResponse response = testCaseService.create(currentUser(authentication), apiRequestId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/test-cases")
    public List<TestCaseResponse> list(Authentication authentication, @PathVariable Long apiRequestId) {
        return testCaseService.list(currentUser(authentication), apiRequestId);
    }

    @DeleteMapping("/test-cases/{testCaseId}")
    public ResponseEntity<Void> delete(Authentication authentication,
                                       @PathVariable Long apiRequestId,
                                       @PathVariable Long testCaseId) {
        testCaseService.delete(currentUser(authentication), apiRequestId, testCaseId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test-cases/{testCaseId}/run")
    public RunSingleTestResponse runSingle(Authentication authentication,
                                           @PathVariable Long apiRequestId,
                                           @PathVariable Long testCaseId) {
        return testCaseService.runSingle(currentUser(authentication), apiRequestId, testCaseId);
    }

    @PostMapping("/test-cases/run-all")
    public RunAllTestsResponse runAll(Authentication authentication, @PathVariable Long apiRequestId) {
        return testCaseService.runAll(currentUser(authentication), apiRequestId);
    }

    @GetMapping("/test-results")
    public List<TestResultResponse> listRecentResults(Authentication authentication, @PathVariable Long apiRequestId) {
        return testCaseService.listRecentResults(currentUser(authentication), apiRequestId);
    }

    private String currentUser(Authentication authentication) {
        return authentication.getName();
    }
}

