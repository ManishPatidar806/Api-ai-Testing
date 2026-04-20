package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.dto.ReadinessCheckItemResponse;
import com.testing.ai_api_testing_platform.dto.ReadinessChecklistResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class ReadinessService {

    private final Environment environment;
    private final DataSource dataSource;
    private final RedisConnectionFactory redisConnectionFactory;

    @Value("${app.security.google.client-id:}")
    private String googleClientId;

    @Value("${app.ai.mock-enabled:true}")
    private boolean aiMockEnabled;

    @Value("${app.ai.api-key:}")
    private String aiApiKey;

    @Value("${app.cors.allowed-origin-patterns:}")
    private String corsAllowedOrigins;

    @Value("${spring.cache.type:none}")
    private String cacheType;

    public ReadinessService(Environment environment,
                            DataSource dataSource,
                            RedisConnectionFactory redisConnectionFactory) {
        this.environment = environment;
        this.dataSource = dataSource;
        this.redisConnectionFactory = redisConnectionFactory;
    }

    public ReadinessChecklistResponse getChecklist() {
        List<ReadinessCheckItemResponse> checks = new ArrayList<>();

        checks.add(checkGoogleClientId());
        checks.add(checkAiProviderConfiguration());
        checks.add(checkDatabaseConnection());
        checks.add(checkRedisConnection());
        checks.add(checkCorsPolicy());

        boolean readyForProduction = checks.stream().noneMatch(item -> "FAIL".equals(item.status()));

        String[] activeProfiles = environment.getActiveProfiles();
        String profile = activeProfiles.length == 0 ? "default" : String.join(",", activeProfiles);

        return new ReadinessChecklistResponse(
                profile,
                readyForProduction,
                checks,
                Instant.now()
        );
    }

    private ReadinessCheckItemResponse checkGoogleClientId() {
        if (!StringUtils.hasText(googleClientId)) {
            return new ReadinessCheckItemResponse("google.client-id", "FAIL", "GOOGLE_CLIENT_ID is missing");
        }

        if (!googleClientId.endsWith(".apps.googleusercontent.com")) {
            return new ReadinessCheckItemResponse("google.client-id", "WARN", "Google client-id format looks unusual");
        }

        return new ReadinessCheckItemResponse("google.client-id", "PASS", "Google client-id is configured");
    }

    private ReadinessCheckItemResponse checkAiProviderConfiguration() {
        if (aiMockEnabled) {
            return new ReadinessCheckItemResponse("ai.provider", "WARN", "AI mock mode is enabled");
        }

        if (!StringUtils.hasText(aiApiKey)) {
            return new ReadinessCheckItemResponse("ai.provider", "FAIL", "AI_API_KEY is required when mock mode is disabled");
        }

        return new ReadinessCheckItemResponse("ai.provider", "PASS", "AI provider key is configured");
    }

    private ReadinessCheckItemResponse checkDatabaseConnection() {
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            if (!valid) {
                return new ReadinessCheckItemResponse("database", "FAIL", "Database connection is not valid");
            }
            return new ReadinessCheckItemResponse("database", "PASS", "Database connection is healthy");
        } catch (Exception ex) {
            return new ReadinessCheckItemResponse("database", "FAIL", "Database unavailable: " + ex.getMessage());
        }
    }

    private ReadinessCheckItemResponse checkRedisConnection() {
        if (!"redis".equalsIgnoreCase(cacheType)) {
            return new ReadinessCheckItemResponse("redis", "WARN", "Redis cache is disabled");
        }

        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            String pong = connection.ping();
            if (!"PONG".equalsIgnoreCase(pong)) {
                return new ReadinessCheckItemResponse("redis", "FAIL", "Redis ping failed");
            }
            return new ReadinessCheckItemResponse("redis", "PASS", "Redis connection is healthy");
        } catch (Exception ex) {
            return new ReadinessCheckItemResponse("redis", "FAIL", "Redis unavailable: " + ex.getMessage());
        }
    }

    private ReadinessCheckItemResponse checkCorsPolicy() {
        if (!StringUtils.hasText(corsAllowedOrigins)) {
            return new ReadinessCheckItemResponse("cors", "FAIL", "CORS_ALLOWED_ORIGIN_PATTERNS is empty");
        }

        boolean wildcardPresent = Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .anyMatch("*"::equals);

        if (wildcardPresent) {
            return new ReadinessCheckItemResponse("cors", "FAIL", "Wildcard origin is not allowed for production");
        }

        return new ReadinessCheckItemResponse("cors", "PASS", "CORS origins are explicitly configured");
    }
}
