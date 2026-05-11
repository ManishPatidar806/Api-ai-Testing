package com.testing.ai_api_testing_platform.controller;

import com.testing.ai_api_testing_platform.dto.request.AiChatRequest;
import com.testing.ai_api_testing_platform.dto.response.AiChatResponse;
import com.testing.ai_api_testing_platform.dto.request.AiErrorAnalysisRequest;
import com.testing.ai_api_testing_platform.dto.response.AiErrorAnalysisResponse;
import com.testing.ai_api_testing_platform.dto.response.AiJobStatusResponse;
import com.testing.ai_api_testing_platform.dto.request.AiTestCaseGeneratorRequest;
import com.testing.ai_api_testing_platform.exception.ResourceNotFoundException;
import com.testing.ai_api_testing_platform.service.AiAsyncJobService;
import com.testing.ai_api_testing_platform.service.AiAsyncJobServiceImpl;
import com.testing.ai_api_testing_platform.service.AiService;
import com.testing.ai_api_testing_platform.service.AiServiceImpl;
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
        return aiService.analyzeError(currentUser(authentication), request);
    }

    @PostMapping("/chat")
    public AiChatResponse chat(Authentication authentication, @Valid @RequestBody AiChatRequest request) {
        return aiService.chat(currentUser(authentication), request);
    }

    @PostMapping("/jobs/error-analyzer")
    public ResponseEntity<AiJobStatusResponse> submitErrorAnalyzerJob(Authentication authentication,
                                                                       @Valid @RequestBody AiErrorAnalysisRequest request) {
        return accepted(aiAsyncJobService.submitErrorAnalysis(currentUser(authentication), request));
    }

    @PostMapping("/jobs/test-case-generator")
    public ResponseEntity<AiJobStatusResponse> submitTestGeneratorJob(Authentication authentication,
                                                                       @Valid @RequestBody AiTestCaseGeneratorRequest request) {
        return accepted(aiAsyncJobService.submitTestGeneration(currentUser(authentication), request));
    }

    @PostMapping("/jobs/chat")
    public ResponseEntity<AiJobStatusResponse> submitChatJob(Authentication authentication,
                                                             @Valid @RequestBody AiChatRequest request) {
        return accepted(aiAsyncJobService.submitChat(currentUser(authentication), request));
    }

    @GetMapping("/jobs/{jobId}")
    public AiJobStatusResponse getJobStatus(Authentication authentication, @PathVariable String jobId) {
        return aiAsyncJobService.getJob(jobId, currentUser(authentication))
                .orElseThrow(() -> new ResourceNotFoundException("AI job not found"));
    }

    private String currentUser(Authentication authentication) {
        return authentication.getName();
    }

    private ResponseEntity<AiJobStatusResponse> accepted(AiJobStatusResponse body) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(body);
    }
}

