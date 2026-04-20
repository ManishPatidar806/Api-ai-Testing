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
        ApiResponse savedResponse;

        try {
            WebClient.RequestBodySpec requestSpec = webClient
                    .method(HttpMethod.valueOf(apiRequest.getHttpMethod().name()))
                .uri(StringUtils.hasText(overrideUrl) ? overrideUrl : apiRequest.getUrl());

            Map<String, String> headers = overrideHeaders == null
                ? (apiRequest.getHeaders() == null ? Map.of() : apiRequest.getHeaders())
                : new HashMap<>(overrideHeaders);
            headers.forEach(requestSpec::header);

            WebClient.RequestHeadersSpec<?> headersSpec;
            if (overrideRequestBody != null && !overrideRequestBody.isBlank()) {
                String contentTypeHeader = headers.entrySet().stream()
                        .filter(entry -> "content-type".equalsIgnoreCase(entry.getKey()))
                        .map(Map.Entry::getValue)
                        .findFirst()
                        .orElse(null);

                if (StringUtils.hasText(contentTypeHeader)) {
                    headersSpec = requestSpec
                            .contentType(MediaType.parseMediaType(contentTypeHeader))
                            .bodyValue(overrideRequestBody);
                } else {
                    headersSpec = requestSpec
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(overrideRequestBody);
                }
            } else {
                headersSpec = requestSpec;
            }

            ApiResponse responseEntity = headersSpec.exchangeToMono(clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .defaultIfEmpty("")
                                    .map(body -> {
                                        ApiResponse response = new ApiResponse();
                                        response.setApiRequest(apiRequest);
                                        response.setStatusCode(clientResponse.statusCode().value());
                                        response.setResponseBody(body);
                                        response.setResponseHeaders(toJsonHeaders(clientResponse.headers().asHttpHeaders().toSingleValueMap()));
                                        response.setResponseTimeMs((System.nanoTime() - startNanos) / 1_000_000);
                                        response.setSuccess(clientResponse.statusCode().is2xxSuccessful());
                                        response.setExecutedAt(Instant.now());
                                        return response;
                                    })
                    )
                    .block();

            if (responseEntity == null) {
                throw new IllegalStateException("API execution returned empty response");
            }
            savedResponse = apiResponseRepository.save(responseEntity);
        } catch (Exception ex) {
            ApiResponse failed = new ApiResponse();
            failed.setApiRequest(apiRequest);
            failed.setStatusCode(resolveFailureStatusCode(ex));
            failed.setResponseBody(resolveFailureResponseBody(ex));
            failed.setResponseHeaders(resolveFailureResponseHeaders(ex));
            failed.setResponseTimeMs((System.nanoTime() - startNanos) / 1_000_000);
            failed.setSuccess(false);
            failed.setErrorMessage(ex.getMessage());
            failed.setExecutedAt(Instant.now());
            savedResponse = apiResponseRepository.save(failed);
        }

        PerformanceMetric metric = new PerformanceMetric();
        metric.setApiRequest(apiRequest);
        metric.setApiResponse(savedResponse);
        metric.setResponseTimeMs(savedResponse.getResponseTimeMs());
        metric.setSuccessful(savedResponse.isSuccess());
        metric.setRecordedAt(Instant.now());
        performanceMetricRepository.save(metric);

        return savedResponse;
    }

    private String toJsonHeaders(Map<String, String> headers) {
        try {
            return objectMapper.writeValueAsString(headers);
        } catch (JsonProcessingException ex) {
            return "{}";
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
        return "{}";
    }
}

