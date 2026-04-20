package com.testing.ai_api_testing_platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testing.ai_api_testing_platform.domain.entity.AiAsyncJob;
import com.testing.ai_api_testing_platform.domain.enums.AiJobStatus;
import com.testing.ai_api_testing_platform.domain.enums.AiJobType;
import com.testing.ai_api_testing_platform.dto.AiChatRequest;
import com.testing.ai_api_testing_platform.dto.AiErrorAnalysisRequest;
import com.testing.ai_api_testing_platform.dto.AiJobStatusResponse;
import com.testing.ai_api_testing_platform.dto.AiTestCaseGeneratorRequest;
import com.testing.ai_api_testing_platform.repository.AiAsyncJobRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AiAsyncJobService {

    private final AiService aiService;
    private final AiAsyncJobRepository aiAsyncJobRepository;
    private final ObjectMapper objectMapper;

    public AiAsyncJobService(AiService aiService,
                             AiAsyncJobRepository aiAsyncJobRepository,
                             ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.aiAsyncJobRepository = aiAsyncJobRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AiJobStatusResponse submitErrorAnalysis(String email, AiErrorAnalysisRequest request) {
        AiAsyncJob job = createPendingJob(email, AiJobType.ERROR_ANALYSIS);
        processErrorAnalysis(job.getJobId(), email, request);
        return toDto(job);
    }

    @Transactional
    public AiJobStatusResponse submitTestGeneration(String email, AiTestCaseGeneratorRequest request) {
        AiAsyncJob job = createPendingJob(email, AiJobType.TEST_GENERATION);
        processTestGeneration(job.getJobId(), email, request);
        return toDto(job);
    }

    @Transactional
    public AiJobStatusResponse submitChat(String email, AiChatRequest request) {
        AiAsyncJob job = createPendingJob(email, AiJobType.CHAT);
        processChat(job.getJobId(), email, request);
        return toDto(job);
    }

    public Optional<AiJobStatusResponse> getJob(String jobId, String requesterEmail) {
        return aiAsyncJobRepository.findByJobIdAndRequestedBy(jobId, requesterEmail).map(this::toDto);
    }

    @Async("aiTaskExecutor")
    @Transactional
    public void processErrorAnalysis(String jobId, String email, AiErrorAnalysisRequest request) {
        try {
            Object result = aiService.analyzeError(email, request);
            updateCompleted(jobId, result);
        } catch (Exception ex) {
            updateFailed(jobId, ex.getMessage());
        }
    }

    @Async("aiTaskExecutor")
    @Transactional
    public void processTestGeneration(String jobId, String email, AiTestCaseGeneratorRequest request) {
        try {
            Object result = aiService.generateTestCases(email, request);
            updateCompleted(jobId, result);
        } catch (Exception ex) {
            updateFailed(jobId, ex.getMessage());
        }
    }

    @Async("aiTaskExecutor")
    @Transactional
    public void processChat(String jobId, String email, AiChatRequest request) {
        try {
            Object result = aiService.chat(email, request);
            updateCompleted(jobId, result);
        } catch (Exception ex) {
            updateFailed(jobId, ex.getMessage());
        }
    }

    private AiAsyncJob createPendingJob(String email, AiJobType type) {
        AiAsyncJob job = new AiAsyncJob();
        job.setJobId(UUID.randomUUID().toString());
        job.setRequestedBy(email);
        job.setType(type);
        job.setStatus(AiJobStatus.PENDING);
        job.setUpdatedAt(Instant.now());
        return aiAsyncJobRepository.save(job);
    }

    private void updateCompleted(String jobId, Object result) {
        aiAsyncJobRepository.findByJobId(jobId).ifPresent(job -> {
            job.setStatus(AiJobStatus.COMPLETED);
            job.setErrorMessage(null);
            job.setResultPayload(toJson(result));
            job.setUpdatedAt(Instant.now());
            aiAsyncJobRepository.save(job);
        });
    }

    private void updateFailed(String jobId, String errorMessage) {
        aiAsyncJobRepository.findByJobId(jobId).ifPresent(job -> {
            job.setStatus(AiJobStatus.FAILED);
            job.setErrorMessage(errorMessage);
            job.setUpdatedAt(Instant.now());
            aiAsyncJobRepository.save(job);
        });
    }

    private AiJobStatusResponse toDto(AiAsyncJob job) {
        return new AiJobStatusResponse(
                job.getJobId(),
                job.getStatus().name(),
                job.getType().name(),
                toJsonNode(job.getResultPayload()),
                job.getErrorMessage(),
                job.getUpdatedAt()
        );
    }

    private String toJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private JsonNode toJsonNode(String raw) {
        try {
            return raw == null ? null : objectMapper.readTree(raw);
        } catch (Exception ex) {
            return null;
        }
    }
}

