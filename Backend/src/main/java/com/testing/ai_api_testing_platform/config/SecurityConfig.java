package com.testing.ai_api_testing_platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final GoogleBearerAuthenticationFilter googleBearerAuthenticationFilter;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
        private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(GoogleBearerAuthenticationFilter googleBearerAuthenticationFilter,
                                                  RestAuthenticationEntryPoint restAuthenticationEntryPoint,
                                                  CorsConfigurationSource corsConfigurationSource) {
        this.googleBearerAuthenticationFilter = googleBearerAuthenticationFilter;
        this.restAuthenticationEntryPoint = restAuthenticationEntryPoint;
                this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception.authenticationEntryPoint(restAuthenticationEntryPoint))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api/v1/auth/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(googleBearerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

