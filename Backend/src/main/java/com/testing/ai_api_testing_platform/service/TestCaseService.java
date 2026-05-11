package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.dto.request.TestCaseCreateUpdateRequest;
import com.testing.ai_api_testing_platform.dto.response.RunAllTestsResponse;
import com.testing.ai_api_testing_platform.dto.response.RunSingleTestResponse;
import com.testing.ai_api_testing_platform.dto.response.TestCaseResponse;
import com.testing.ai_api_testing_platform.dto.response.TestResultResponse;
import org.springframework.stereotype.Service;



import java.util.*;


@Service
public interface TestCaseService {
    public TestCaseResponse create(String email, Long apiRequestId, TestCaseCreateUpdateRequest request);
    public List<TestCaseResponse> list(String email, Long apiRequestId);
    public void delete(String email, Long apiRequestId, Long testCaseId) ;
    public RunSingleTestResponse runSingle(String email, Long apiRequestId, Long testCaseId) ;
    public RunAllTestsResponse runAll(String email, Long apiRequestId) ;
    public List<TestResultResponse> listRecentResults(String email, Long apiRequestId) ;
}


