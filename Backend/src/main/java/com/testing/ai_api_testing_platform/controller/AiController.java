package com.testing.ai_api_testing_platform.controller;

import com.testing.ai_api_testing_platform.dto.AiChatRequest;
import com.testing.ai_api_testing_platform.dto.AiChatResponse;
import com.testing.ai_api_testing_platform.dto.AiErrorAnalysisRequest;
import com.testing.ai_api_testing_platform.dto.AiErrorAnalysisResponse;
import com.testing.ai_api_testing_platform.dto.AiJobStatusResponse;
import com.testing.ai_api_testing_platform.dto.AiTestCaseGeneratorRequest;
import com.testing.ai_api_testing_platform.dto.AiTestCaseGeneratorResponse;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.service.AiAsyncJobService;
import com.testing.ai_api_testing_platform.service.AiService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;
    private final AiAsyncJobService aiAsyncJobService;

    public AiController(AiService aiService, AiAsyncJobService aiAsyncJobService) {
        this.aiService = aiService;
        this.aiAsyncJobService = aiAsyncJobService;
    }

    @PostMapping("/error-analyzer")
    public AiErrorAnalysisResponse analyzeError(Authentication authentication,
                                                @Valid @RequestBody AiErrorAnalysisRequest request) {
        return aiService.analyzeError(authentication.getName(), request);
    }

    @PostMapping("/test-case-generator")
    public AiTestCaseGeneratorResponse generateTestCases(Authentication authentication,
                                                         @Valid @RequestBody AiTestCaseGeneratorRequest request) {
        return aiService.generateTestCases(authentication.getName(), request);
    }

    @PostMapping("/chat")
    public AiChatResponse chat(Authentication authentication, @Valid @RequestBody AiChatRequest request) {
        return aiService.chat(authentication.getName(), request);
    }

    @PostMapping("/jobs/error-analyzer")
    public ResponseEntity<AiJobStatusResponse> submitErrorAnalyzerJob(Authentication authentication,
                                                                       @Valid @RequestBody AiErrorAnalysisRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(aiAsyncJobService.submitErrorAnalysis(authentication.getName(), request));
    }

    @PostMapping("/jobs/test-case-generator")
    public ResponseEntity<AiJobStatusResponse> submitTestGeneratorJob(Authentication authentication,
                                                                       @Valid @RequestBody AiTestCaseGeneratorRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(aiAsyncJobService.submitTestGeneration(authentication.getName(), request));
    }

    @PostMapping("/jobs/chat")
    public ResponseEntity<AiJobStatusResponse> submitChatJob(Authentication authentication,
                                                             @Valid @RequestBody AiChatRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(aiAsyncJobService.submitChat(authentication.getName(), request));
    }

    @GetMapping("/jobs/{jobId}")
    public AiJobStatusResponse getJobStatus(Authentication authentication, @PathVariable String jobId) {
        return aiAsyncJobService.getJob(jobId, authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("AI job not found"));
    }
}

