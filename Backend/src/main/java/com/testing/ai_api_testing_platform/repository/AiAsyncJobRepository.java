package com.testing.ai_api_testing_platform.repository;

import com.testing.ai_api_testing_platform.domain.entity.AiAsyncJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiAsyncJobRepository extends JpaRepository<AiAsyncJob, Long> {

    Optional<AiAsyncJob> findByJobId(String jobId);

    Optional<AiAsyncJob> findByJobIdAndRequestedBy(String jobId, String requestedBy);
}


