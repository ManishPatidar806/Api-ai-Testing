package com.testing.ai_api_testing_platform.repository;

import com.testing.ai_api_testing_platform.domain.entity.PerformanceMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PerformanceMetricRepository extends JpaRepository<PerformanceMetric, Long> {

    List<PerformanceMetric> findTop500ByApiRequestIdOrderByRecordedAtDesc(Long apiRequestId);

    List<PerformanceMetric> findTop100ByApiRequestIdAndApiRequestUserIdOrderByRecordedAtDesc(Long apiRequestId, Long userId);

    long countByApiRequestIdAndApiRequestUserId(Long apiRequestId, Long userId);

    long countByApiRequestIdAndApiRequestUserIdAndSuccessfulTrue(Long apiRequestId, Long userId);

    @Query("select avg(pm.responseTimeMs) from PerformanceMetric pm where pm.apiRequest.id = :apiRequestId and pm.apiRequest.user.id = :userId")
    Double findAverageResponseTimeByRequestAndUser(@Param("apiRequestId") Long apiRequestId, @Param("userId") Long userId);
}


