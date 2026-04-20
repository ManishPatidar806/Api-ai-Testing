# AI API Testing Platform - Backend

This repository contains the backend for an AI-powered API Testing and Debugging platform built with Spring Boot.

## Current Implementation (Step 1)

- Layered package skeleton (`controller`, `service`, `repository`, `dto`, `config`, `exception`)
- Core domain entities with JPA mappings:
  - `User`
  - `ApiRequest`
  - `ApiResponse`
  - `TestCase`
  - `TestResult`
  - `PerformanceMetric`
- Shared audit base entity (`createdAt`, `updatedAt`)
- Initial repository interfaces for core entities
- PostgreSQL runtime configuration and H2 test profile

## Current Implementation (Step 2)

- Google-only authentication with stateless Spring Security protection
- Authentication endpoint:
  - `POST /api/v1/auth/google`
- Protected sample endpoint:
  - `GET /api/v1/users/me`
- Google ID token JWT verification using Google public JWK keys (cached in backend process)
- Every protected API call requires: `Authorization: Bearer <GOOGLE_ID_TOKEN>`
- Global exception handler with consistent JSON error payloads

## Current Implementation (Step 3)

- API Request CRUD endpoints (authenticated, user-scoped):
  - `POST /api/v1/api-requests`
  - `GET /api/v1/api-requests`
  - `GET /api/v1/api-requests/{requestId}`
  - `PUT /api/v1/api-requests/{requestId}`
  - `DELETE /api/v1/api-requests/{requestId}`
- Execute API request with `WebClient`:
  - `POST /api/v1/api-requests/{requestId}/execute`
- Response history endpoint:
  - `GET /api/v1/api-requests/{requestId}/responses`
- Execution stores:
  - `ApiResponse` (status code, response body, response time, success/failure)
  - `PerformanceMetric` sample record for each execution

## Current Implementation (Step 4)

- Test case CRUD (authenticated, user-scoped):
  - `POST /api/v1/api-requests/{apiRequestId}/test-cases`
  - `GET /api/v1/api-requests/{apiRequestId}/test-cases`
  - `GET /api/v1/api-requests/{apiRequestId}/test-cases/{testCaseId}`
  - `PUT /api/v1/api-requests/{apiRequestId}/test-cases/{testCaseId}`
  - `DELETE /api/v1/api-requests/{apiRequestId}/test-cases/{testCaseId}` (soft-deactivate)
- Test execution:
  - `POST /api/v1/api-requests/{apiRequestId}/test-cases/{testCaseId}/run`
  - `POST /api/v1/api-requests/{apiRequestId}/test-cases/run-all`
  - `GET /api/v1/api-requests/{apiRequestId}/test-results`
- Assertion rules:
  - expected status code
  - max response time
  - expected keyword in response body
- Each test run persists `TestResult` with PASS/FAIL and assertion summary.

## Current Implementation (Step 5)

- AI capabilities (authenticated):
  - `POST /api/v1/ai/error-analyzer`
  - `POST /api/v1/ai/test-case-generator`
  - `POST /api/v1/ai/chat`
- Async AI jobs:
  - `POST /api/v1/ai/jobs/error-analyzer`
  - `POST /api/v1/ai/jobs/test-case-generator`
  - `POST /api/v1/ai/jobs/chat`
  - `GET /api/v1/ai/jobs/{jobId}`
- AI context uses owned API request and latest response history.
- Caching is enabled for AI responses (`aiErrorAnalysis`, `aiTestGeneration`, `aiChat`).
- Bucket4j rate limiting is applied to all `/api/v1/ai/**` endpoints.
- Shared API execution flow extracted into reusable `ApiExecutionService`.

## Current Implementation (Step 6)

- Performance analytics endpoints (authenticated, user-scoped):
  - `GET /api/v1/api-requests/{apiRequestId}/performance/average-response-time`
  - `GET /api/v1/api-requests/{apiRequestId}/performance/success-rate`
  - `GET /api/v1/api-requests/{apiRequestId}/performance/failure-rate`
  - `GET /api/v1/api-requests/{apiRequestId}/performance/trend-summary`
- Aggregates are computed from persisted `PerformanceMetric` records.
- Trend summary reports overall average, recent average, success/failure rates, and latency trend.

## Current Implementation (Step 7)

- Async AI jobs are persisted in PostgreSQL (`ai_async_jobs`) instead of in-memory maps.
- Environment profile hardening added:
  - `application-dev.properties` keeps fast local behavior.
  - `application-prod.properties` enforces stricter runtime defaults.
- Security exposure tightened by removing public Swagger/OpenAPI routes from unauthenticated allowlist.
- Docker Compose now runs with production profile defaults.

## Current Implementation (Step 8)

- Authentication simplified for Google-only sign-in/sign-up.
- JWT access tokens and refresh token endpoints are removed from active auth flow.
- API is stateless: backend validates Google ID token on each request and sets request-scoped `SecurityContext`.

## Current Implementation (Step 9)

- AI async job visibility enforced per requester.
- Request owner can view only own job status/results.

## Config Validation Notes

- `GOOGLE_CLIENT_ID` must be set and match your frontend Google client.
- If `AI_MOCK_ENABLED=false`, then `AI_API_KEY` is required.
- `CORS_ALLOWED_ORIGIN_PATTERNS` should be explicit (avoid `*` in production).
- `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` must point to reachable PostgreSQL.
- If `spring.cache.type=redis`, ensure `REDIS_HOST` and `REDIS_PORT` are reachable.

Example production-oriented env:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
AI_MOCK_ENABLED=false
AI_API_KEY=your-key
CORS_ALLOWED_ORIGIN_PATTERNS=https://your-frontend.example.com
DB_URL=jdbc:postgresql://db:5432/ai_api_testing_platform
DB_USERNAME=postgres
DB_PASSWORD=strong-password
REDIS_HOST=redis
REDIS_PORT=6379
```

## Run Tests

```bash
./mvnw test
```

## Next Steps

1. Add a formal schema management approach (manual SQL release scripts or another migration tool) for production-safe DB changes.
2. Add API key/secret management abstractions for multi-provider AI routing.
3. Add per-workspace/team role memberships for multi-user collaboration.






