package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.dto.AiGeneratedTestCase;
import com.testing.ai_api_testing_platform.dto.request.AiChatRequest;
import com.testing.ai_api_testing_platform.dto.request.AiErrorAnalysisRequest;
import com.testing.ai_api_testing_platform.dto.request.AiTestCaseGeneratorRequest;
import com.testing.ai_api_testing_platform.dto.response.AiChatResponse;
import com.testing.ai_api_testing_platform.dto.response.AiErrorAnalysisResponse;
import com.testing.ai_api_testing_platform.dto.response.AiTestCaseGeneratorResponse;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
@Service
public interface AiService {
    public AiErrorAnalysisResponse analyzeError(String email, AiErrorAnalysisRequest request) ;
    public AiTestCaseGeneratorResponse generateTestCases(String email, AiTestCaseGeneratorRequest request) ;
    public AiChatResponse chat(String email, AiChatRequest request) ;
}
