package com.testing.ai_api_testing_platform.config;

import com.testing.ai_api_testing_platform.domain.entity.User;
import com.testing.ai_api_testing_platform.service.AuthService;
import com.testing.ai_api_testing_platform.service.GoogleTokenVerifierService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class GoogleBearerAuthenticationFilter extends OncePerRequestFilter {

    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final AuthService authService;

    public GoogleBearerAuthenticationFilter(GoogleTokenVerifierService googleTokenVerifierService,
                                            AuthService authService) {
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String idToken = authHeader.substring(7).trim();
        if (idToken.isEmpty()) {
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
            return;
        }

        try {
            GoogleTokenVerifierService.GoogleTokenPayload payload = googleTokenVerifierService.verifyIdToken(idToken);
            User user = authService.upsertFromGooglePayload(payload);

            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    user.getEmail(),
                    null,
                    List.of(() -> "ROLE_" + user.getRole())
            );
            authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
        } catch (RuntimeException ex) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}

