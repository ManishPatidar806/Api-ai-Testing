package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.AiAsyncJob;
import com.testing.ai_api_testing_platform.domain.enums.AiJobType;
import com.testing.ai_api_testing_platform.dto.request.AiChatRequest;
import com.testing.ai_api_testing_platform.dto.request.AiErrorAnalysisRequest;
import com.testing.ai_api_testing_platform.dto.request.AiTestCaseGeneratorRequest;
import com.testing.ai_api_testing_platform.dto.response.AiJobStatusResponse;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
@Service
public interface AiAsyncJobService {

    public AiJobStatusResponse submitErrorAnalysis(String email, AiErrorAnalysisRequest request) ;
    public AiJobStatusResponse submitTestGeneration(String email, AiTestCaseGeneratorRequest request) ;
    public AiJobStatusResponse submitChat(String email, AiChatRequest request) ;

    public Optional<AiJobStatusResponse> getJob(String jobId, String requesterEmail);
    public void processErrorAnalysis(String jobId, String email, AiErrorAnalysisRequest request) ;
    public void processTestGeneration(String jobId, String email, AiTestCaseGeneratorRequest request) ;
    public void processChat(String jobId, String email, AiChatRequest request) ;


}
