package com.testing.ai_api_testing_platform.domain.entity;

import com.testing.ai_api_testing_platform.domain.enums.AiJobStatus;
import com.testing.ai_api_testing_platform.domain.enums.AiJobType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(
        name = "ai_async_jobs",
        indexes = {
                @Index(name = "idx_ai_async_jobs_requested_by", columnList = "requested_by"),
                @Index(name = "idx_ai_async_jobs_updated_at", columnList = "updated_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_ai_async_jobs_job_id", columnNames = "job_id")
        }
)
public class AiAsyncJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiJobStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiJobType type;

    @Column(name = "requested_by", nullable = false, length = 255)
    private String requestedBy;

    @Column(name = "result_payload", columnDefinition = "TEXT")
    private String resultPayload;

    @Column(name = "error_message", length = 2000)
    private String errorMessage;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public AiJobStatus getStatus() {
        return status;
    }

    public void setStatus(AiJobStatus status) {
        this.status = status;
    }

    public AiJobType getType() {
        return type;
    }

    public void setType(AiJobType type) {
        this.type = type;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }

    public String getResultPayload() {
        return resultPayload;
    }

    public void setResultPayload(String resultPayload) {
        this.resultPayload = resultPayload;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

