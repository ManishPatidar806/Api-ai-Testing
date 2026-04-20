package com.testing.ai_api_testing_platform.repository;

import com.testing.ai_api_testing_platform.domain.entity.ApiResponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApiResponseRepository extends JpaRepository<ApiResponse, Long> {

    List<ApiResponse> findTop50ByApiRequestIdOrderByExecutedAtDesc(Long apiRequestId);

    List<ApiResponse> findTop20ByApiRequestIdAndApiRequestUserIdOrderByExecutedAtDesc(Long apiRequestId, Long userId);

    Optional<ApiResponse> findTopByApiRequestIdAndApiRequestUserIdOrderByExecutedAtDesc(Long apiRequestId, Long userId);
}



