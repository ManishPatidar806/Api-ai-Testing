package com.testing.ai_api_testing_platform.domain.entity;

import com.testing.ai_api_testing_platform.domain.enums.TestExecutionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
        name = "test_results",
        indexes = {
                @Index(name = "idx_test_results_case_executed", columnList = "test_case_id,executed_at")
        }
)
public class TestResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_response_id")
    private ApiResponse apiResponse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TestExecutionStatus status;

    @Column(name = "actual_status_code")
    private Integer actualStatusCode;

    @Column(name = "actual_response_time_ms")
    private Long actualResponseTimeMs;

    @Column(name = "keyword_matched")
    private Boolean keywordMatched;

    @Column(name = "assertion_message", length = 2000)
    private String assertionMessage;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public TestCase getTestCase() {
        return testCase;
    }

    public void setTestCase(TestCase testCase) {
        this.testCase = testCase;
    }

    public ApiResponse getApiResponse() {
        return apiResponse;
    }

    public void setApiResponse(ApiResponse apiResponse) {
        this.apiResponse = apiResponse;
    }

    public TestExecutionStatus getStatus() {
        return status;
    }

    public void setStatus(TestExecutionStatus status) {
        this.status = status;
    }

    public Integer getActualStatusCode() {
        return actualStatusCode;
    }

    public void setActualStatusCode(Integer actualStatusCode) {
        this.actualStatusCode = actualStatusCode;
    }

    public Long getActualResponseTimeMs() {
        return actualResponseTimeMs;
    }

    public void setActualResponseTimeMs(Long actualResponseTimeMs) {
        this.actualResponseTimeMs = actualResponseTimeMs;
    }

    public Boolean getKeywordMatched() {
        return keywordMatched;
    }

    public void setKeywordMatched(Boolean keywordMatched) {
        this.keywordMatched = keywordMatched;
    }

    public String getAssertionMessage() {
        return assertionMessage;
    }

    public void setAssertionMessage(String assertionMessage) {
        this.assertionMessage = assertionMessage;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(Instant executedAt) {
        this.executedAt = executedAt;
    }
}

