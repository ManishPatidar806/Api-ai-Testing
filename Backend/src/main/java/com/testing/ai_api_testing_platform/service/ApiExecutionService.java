package com.testing.ai_api_testing_platform.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import com.testing.ai_api_testing_platform.domain.entity.PerformanceMetric;
import com.testing.ai_api_testing_platform.repository.ApiResponseRepository;
import com.testing.ai_api_testing_platform.repository.PerformanceMetricRepository;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class ApiExecutionService {

    private static final String DEFAULT_JSON_HEADERS = "{}";

    private final WebClient webClient;
    private final ApiResponseRepository apiResponseRepository;
    private final PerformanceMetricRepository performanceMetricRepository;
    private final ObjectMapper objectMapper;

    public ApiExecutionService(WebClient webClient,
                               ApiResponseRepository apiResponseRepository,
                               PerformanceMetricRepository performanceMetricRepository,
                               ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.apiResponseRepository = apiResponseRepository;
        this.performanceMetricRepository = performanceMetricRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ApiResponse executeAndPersist(ApiRequest apiRequest) {
        return executeAndPersist(apiRequest, apiRequest.getUrl(), apiRequest.getHeaders(), apiRequest.getRequestBody());
    }

    @Transactional
    public ApiResponse executeAndPersist(ApiRequest apiRequest,
                                         String overrideUrl,
                                         Map<String, String> overrideHeaders,
                                         String overrideRequestBody) {
        long startNanos = System.nanoTime();
        ApiResponse savedResponse = executeAndStore(apiRequest, overrideUrl, overrideHeaders, overrideRequestBody, startNanos);
        savePerformanceMetric(apiRequest, savedResponse);

        return savedResponse;
    }

    private ApiResponse executeAndStore(ApiRequest apiRequest,
                                        String overrideUrl,
                                        Map<String, String> overrideHeaders,
                                        String overrideRequestBody,
                                        long startNanos) {
        try {
            ApiResponse responseEntity = executeRequest(apiRequest, overrideUrl, overrideHeaders, overrideRequestBody, startNanos);
            return apiResponseRepository.save(responseEntity);
        } catch (Exception ex) {
            return apiResponseRepository.save(buildFailureResponse(apiRequest, ex, startNanos));
        }
    }

    private ApiResponse executeRequest(ApiRequest apiRequest,
                                       String overrideUrl,
                                       Map<String, String> overrideHeaders,
                                       String overrideRequestBody,
                                       long startNanos) {
        WebClient.RequestBodySpec requestSpec = webClient
            .method(HttpMethod.valueOf(apiRequest.getHttpMethod().name()))
            .uri(StringUtils.hasText(overrideUrl) ? overrideUrl : apiRequest.getUrl());

        Map<String, String> headers = resolveHeaders(apiRequest, overrideHeaders);
        headers.forEach(requestSpec::header);

        WebClient.RequestHeadersSpec<?> headersSpec = applyBody(requestSpec, headers, overrideRequestBody);
        ApiResponse responseEntity = headersSpec.exchangeToMono(clientResponse ->
                clientResponse.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .map(body -> buildSuccessResponse(apiRequest, clientResponse, body, startNanos))
            )
            .block();

        if (responseEntity == null) {
            throw new IllegalStateException("API execution returned empty response");
        }
        return responseEntity;
    }

    private Map<String, String> resolveHeaders(ApiRequest apiRequest, Map<String, String> overrideHeaders) {
        if (overrideHeaders != null) {
            return new HashMap<>(overrideHeaders);
        }
        if (apiRequest.getHeaders() == null) {
            return Map.of();
        }
        return apiRequest.getHeaders();
    }

    private WebClient.RequestHeadersSpec<?> applyBody(WebClient.RequestBodySpec requestSpec,
                                                      Map<String, String> headers,
                                                      String overrideRequestBody) {
        if (!StringUtils.hasText(overrideRequestBody)) {
            return requestSpec;
        }

        String contentTypeHeader = headers.entrySet().stream()
            .filter(entry -> "content-type".equalsIgnoreCase(entry.getKey()))
            .map(Map.Entry::getValue)
            .findFirst()
            .orElse(null);

        MediaType contentType = StringUtils.hasText(contentTypeHeader)
            ? MediaType.parseMediaType(contentTypeHeader)
            : MediaType.APPLICATION_JSON;

        return requestSpec.contentType(contentType).bodyValue(overrideRequestBody);
    }

    private ApiResponse buildSuccessResponse(ApiRequest apiRequest,
                                             org.springframework.web.reactive.function.client.ClientResponse clientResponse,
                                             String body,
                                             long startNanos) {
        ApiResponse response = new ApiResponse();
        response.setApiRequest(apiRequest);
        response.setStatusCode(clientResponse.statusCode().value());
        response.setResponseBody(body);
        response.setResponseHeaders(toJsonHeaders(clientResponse.headers().asHttpHeaders().toSingleValueMap()));
        response.setResponseTimeMs(calculateElapsedMillis(startNanos));
        response.setSuccess(clientResponse.statusCode().is2xxSuccessful());
        response.setExecutedAt(Instant.now());
        return response;
    }

    private ApiResponse buildFailureResponse(ApiRequest apiRequest, Exception ex, long startNanos) {
        ApiResponse failed = new ApiResponse();
        failed.setApiRequest(apiRequest);
        failed.setStatusCode(resolveFailureStatusCode(ex));
        failed.setResponseBody(resolveFailureResponseBody(ex));
        failed.setResponseHeaders(resolveFailureResponseHeaders(ex));
        failed.setResponseTimeMs(calculateElapsedMillis(startNanos));
        failed.setSuccess(false);
        failed.setErrorMessage(ex.getMessage());
        failed.setExecutedAt(Instant.now());
        return failed;
    }

    private void savePerformanceMetric(ApiRequest apiRequest, ApiResponse savedResponse) {
        PerformanceMetric metric = new PerformanceMetric();
        metric.setApiRequest(apiRequest);
        metric.setApiResponse(savedResponse);
        metric.setResponseTimeMs(savedResponse.getResponseTimeMs());
        metric.setSuccessful(savedResponse.isSuccess());
        metric.setRecordedAt(Instant.now());
        performanceMetricRepository.save(metric);
    }

    private long calculateElapsedMillis(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }

    private String toJsonHeaders(Map<String, String> headers) {
        try {
            return objectMapper.writeValueAsString(headers);
        } catch (JsonProcessingException ex) {
            return DEFAULT_JSON_HEADERS;
        }
    }

    private int resolveFailureStatusCode(Exception ex) {
        if (ex instanceof WebClientResponseException webEx) {
            return webEx.getStatusCode().value();
        }
        return 0;
    }

    private String resolveFailureResponseBody(Exception ex) {
        if (ex instanceof WebClientResponseException webEx) {
            String body = webEx.getResponseBodyAsString();
            if (StringUtils.hasText(body)) {
                return body;
            }
        }
        return ex.getMessage() == null ? "" : ex.getMessage();
    }

    private String resolveFailureResponseHeaders(Exception ex) {
        if (ex instanceof WebClientResponseException webEx) {
            return toJsonHeaders(webEx.getHeaders().toSingleValueMap());
        }
        return DEFAULT_JSON_HEADERS;
    }
}

