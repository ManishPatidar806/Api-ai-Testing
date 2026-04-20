package com.testing.ai_api_testing_platform.repository;

import com.testing.ai_api_testing_platform.domain.entity.ApiRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApiRequestRepository extends JpaRepository<ApiRequest, Long> {

    List<ApiRequest> findByUserId(Long userId);

    Optional<ApiRequest> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);
}


