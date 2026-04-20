package com.testing.ai_api_testing_platform.repository;

import com.testing.ai_api_testing_platform.domain.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {

    List<TestCase> findByApiRequestIdAndActiveTrue(Long apiRequestId);

    List<TestCase> findByApiRequestIdAndApiRequestUserId(Long apiRequestId, Long userId);

    List<TestCase> findByApiRequestIdAndApiRequestUserIdAndActiveTrue(Long apiRequestId, Long userId);

    Optional<TestCase> findByIdAndApiRequestIdAndApiRequestUserId(Long id, Long apiRequestId, Long userId);
}


