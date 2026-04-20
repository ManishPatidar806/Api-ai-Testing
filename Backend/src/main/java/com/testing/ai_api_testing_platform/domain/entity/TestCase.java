package com.testing.ai_api_testing_platform.domain.entity;

import com.testing.ai_api_testing_platform.domain.enums.TestCaseMode;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "test_cases",
        indexes = {
                @Index(name = "idx_test_cases_request", columnList = "api_request_id"),
                @Index(name = "idx_test_cases_active", columnList = "active")
        }
)
public class TestCase extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "api_request_id", nullable = false)
    private ApiRequest apiRequest;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(name = "expected_status_code")
    private Integer expectedStatusCode;

    @Column(name = "max_response_time_ms")
    private Long maxResponseTimeMs;

    @Column(name = "expected_keyword", length = 255)
    private String expectedKeyword;

    @Column(name = "required_response_tokens", length = 1200)
    private String requiredResponseTokens;

    @Column(name = "forbidden_response_tokens", length = 1200)
    private String forbiddenResponseTokens;

    @Column(name = "required_json_paths", length = 1200)
    private String requiredJsonPaths;

    @Column(name = "expected_json_path_values", length = 1800)
    private String expectedJsonPathValues;

    @Column(name = "forbidden_json_path_values", length = 1800)
    private String forbiddenJsonPathValues;

    @Column(name = "setup_api_request_id")
    private Long setupApiRequestId;

    @Column(name = "setup_extract_json_path", length = 300)
    private String setupExtractJsonPath;

    @Column(name = "setup_variable_name", length = 80)
    private String setupVariableName;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_mode", nullable = false, length = 20)
    private TestCaseMode testMode = TestCaseMode.FUNCTIONAL;

    @Column(name = "brute_force_attempts")
    private Integer bruteForceAttempts;

    @Column(name = "brute_force_block_status_code")
    private Integer bruteForceBlockStatusCode;

    @Column(name = "brute_force_start_blocking_after")
    private Integer bruteForceStartBlockingAfter;

    @Column(name = "brute_force_delay_ms")
    private Long bruteForceDelayMs;

    @Column(nullable = false)
    private boolean active = true;

    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestResult> testResults = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public ApiRequest getApiRequest() {
        return apiRequest;
    }

    public void setApiRequest(ApiRequest apiRequest) {
        this.apiRequest = apiRequest;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getExpectedStatusCode() {
        return expectedStatusCode;
    }

    public void setExpectedStatusCode(Integer expectedStatusCode) {
        this.expectedStatusCode = expectedStatusCode;
    }

    public Long getMaxResponseTimeMs() {
        return maxResponseTimeMs;
    }

    public void setMaxResponseTimeMs(Long maxResponseTimeMs) {
        this.maxResponseTimeMs = maxResponseTimeMs;
    }

    public String getExpectedKeyword() {
        return expectedKeyword;
    }

    public void setExpectedKeyword(String expectedKeyword) {
        this.expectedKeyword = expectedKeyword;
    }

    public String getRequiredResponseTokens() {
        return requiredResponseTokens;
    }

    public void setRequiredResponseTokens(String requiredResponseTokens) {
        this.requiredResponseTokens = requiredResponseTokens;
    }

    public String getForbiddenResponseTokens() {
        return forbiddenResponseTokens;
    }

    public void setForbiddenResponseTokens(String forbiddenResponseTokens) {
        this.forbiddenResponseTokens = forbiddenResponseTokens;
    }

    public String getRequiredJsonPaths() {
        return requiredJsonPaths;
    }

    public void setRequiredJsonPaths(String requiredJsonPaths) {
        this.requiredJsonPaths = requiredJsonPaths;
    }

    public String getExpectedJsonPathValues() {
        return expectedJsonPathValues;
    }

    public void setExpectedJsonPathValues(String expectedJsonPathValues) {
        this.expectedJsonPathValues = expectedJsonPathValues;
    }

    public String getForbiddenJsonPathValues() {
        return forbiddenJsonPathValues;
    }

    public void setForbiddenJsonPathValues(String forbiddenJsonPathValues) {
        this.forbiddenJsonPathValues = forbiddenJsonPathValues;
    }

    public Long getSetupApiRequestId() {
        return setupApiRequestId;
    }

    public void setSetupApiRequestId(Long setupApiRequestId) {
        this.setupApiRequestId = setupApiRequestId;
    }

    public String getSetupExtractJsonPath() {
        return setupExtractJsonPath;
    }

    public void setSetupExtractJsonPath(String setupExtractJsonPath) {
        this.setupExtractJsonPath = setupExtractJsonPath;
    }

    public String getSetupVariableName() {
        return setupVariableName;
    }

    public void setSetupVariableName(String setupVariableName) {
        this.setupVariableName = setupVariableName;
    }

    public TestCaseMode getTestMode() {
        return testMode;
    }

    public void setTestMode(TestCaseMode testMode) {
        this.testMode = testMode;
    }

    public Integer getBruteForceAttempts() {
        return bruteForceAttempts;
    }

    public void setBruteForceAttempts(Integer bruteForceAttempts) {
        this.bruteForceAttempts = bruteForceAttempts;
    }

    public Integer getBruteForceBlockStatusCode() {
        return bruteForceBlockStatusCode;
    }

    public void setBruteForceBlockStatusCode(Integer bruteForceBlockStatusCode) {
        this.bruteForceBlockStatusCode = bruteForceBlockStatusCode;
    }

    public Integer getBruteForceStartBlockingAfter() {
        return bruteForceStartBlockingAfter;
    }

    public void setBruteForceStartBlockingAfter(Integer bruteForceStartBlockingAfter) {
        this.bruteForceStartBlockingAfter = bruteForceStartBlockingAfter;
    }

    public Long getBruteForceDelayMs() {
        return bruteForceDelayMs;
    }

    public void setBruteForceDelayMs(Long bruteForceDelayMs) {
        this.bruteForceDelayMs = bruteForceDelayMs;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public List<TestResult> getTestResults() {
        return testResults;
    }
}

