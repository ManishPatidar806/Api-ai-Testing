package com.testing.ai_api_testing_platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableCaching
public class AiApiTestingPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiApiTestingPlatformApplication.class, args);
    }

}
