package com.testing.ai_api_testing_platform.domain.entity;

import com.testing.ai_api_testing_platform.domain.enums.HttpMethodType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(
        name = "api_requests",
        indexes = {
                @Index(name = "idx_api_requests_user", columnList = "user_id"),
                @Index(name = "idx_api_requests_url", columnList = "url")
        }
)
public class ApiRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 2048)
    private String url;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "http_method", nullable = false, length = 20)
    private HttpMethodType httpMethod;

    @ElementCollection
    @CollectionTable(name = "api_request_headers", joinColumns = @JoinColumn(name = "api_request_id"))
    @MapKeyColumn(name = "header_key", length = 255)
    @Column(name = "header_value", length = 2000)
    private Map<String, String> headers = new HashMap<>();

    @Column(name = "request_body", columnDefinition = "TEXT")
    private String requestBody;

    @Column(length = 1000)
    private String description;

    @OneToMany(mappedBy = "apiRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ApiResponse> responses = new ArrayList<>();

    @OneToMany(mappedBy = "apiRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestCase> testCases = new ArrayList<>();

    @OneToMany(mappedBy = "apiRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PerformanceMetric> performanceMetrics = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public HttpMethodType getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(HttpMethodType httpMethod) {
        this.httpMethod = httpMethod;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, String> headers) {
        this.headers = headers;
    }

    public String getRequestBody() {
        return requestBody;
    }

    public void setRequestBody(String requestBody) {
        this.requestBody = requestBody;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<ApiResponse> getResponses() {
        return responses;
    }

    public List<TestCase> getTestCases() {
        return testCases;
    }

    public List<PerformanceMetric> getPerformanceMetrics() {
        return performanceMetrics;
    }
}

