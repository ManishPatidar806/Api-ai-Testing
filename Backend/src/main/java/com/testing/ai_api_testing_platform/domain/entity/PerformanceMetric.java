package com.testing.ai_api_testing_platform.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(
        name = "performance_metrics",
        indexes = {
                @Index(name = "idx_perf_metrics_request_recorded", columnList = "api_request_id,recorded_at"),
                @Index(name = "idx_perf_metrics_success", columnList = "successful")
        }
)
public class PerformanceMetric extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "api_request_id", nullable = false)
    private ApiRequest apiRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_response_id")
    private ApiResponse apiResponse;

    @Column(name = "response_time_ms", nullable = false)
    private Long responseTimeMs;

    @Column(nullable = false)
    private boolean successful;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public ApiRequest getApiRequest() {
        return apiRequest;
    }

    public void setApiRequest(ApiRequest apiRequest) {
        this.apiRequest = apiRequest;
    }

    public ApiResponse getApiResponse() {
        return apiResponse;
    }

    public void setApiResponse(ApiResponse apiResponse) {
        this.apiResponse = apiResponse;
    }

    public Long getResponseTimeMs() {
        return responseTimeMs;
    }

    public void setResponseTimeMs(Long responseTimeMs) {
        this.responseTimeMs = responseTimeMs;
    }

    public boolean isSuccessful() {
        return successful;
    }

    public void setSuccessful(boolean successful) {
        this.successful = successful;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }
}

