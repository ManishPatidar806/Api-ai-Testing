package com.testing.ai_api_testing_platform.repository;

import com.testing.ai_api_testing_platform.domain.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestResultRepository extends JpaRepository<TestResult, Long> {

    List<TestResult> findTop100ByTestCaseApiRequestIdOrderByExecutedAtDesc(Long apiRequestId);

    List<TestResult> findTop100ByTestCaseApiRequestIdAndTestCaseApiRequestUserIdOrderByExecutedAtDesc(Long apiRequestId,
                                                                                                         Long userId);
}


