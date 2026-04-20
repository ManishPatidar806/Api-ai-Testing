package com.testing.ai_api_testing_platform.dto;

import java.time.Instant;
import java.util.List;

public record ReadinessChecklistResponse(
        String environment,
        boolean readyForProduction,
        List<ReadinessCheckItemResponse> checks,
        Instant checkedAt
) {
}
