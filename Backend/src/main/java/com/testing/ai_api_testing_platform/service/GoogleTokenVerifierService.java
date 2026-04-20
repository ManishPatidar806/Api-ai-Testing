package com.testing.ai_api_testing_platform.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.testing.ai_api_testing_platform.exception.AuthenticationFailedException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.Set;

@Service
public class GoogleTokenVerifierService {

    private static final Set<String> VALID_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private final String expectedClientId;
    private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    public GoogleTokenVerifierService(@Value("${app.security.google.client-id:}") String expectedClientId) {
        this.expectedClientId = expectedClientId;
        this.jwtProcessor = buildJwtProcessor();
    }

    public GoogleTokenPayload verifyIdToken(String idToken) {
        if (!StringUtils.hasText(expectedClientId)) {
            throw new AuthenticationFailedException("Google client-id is not configured");
        }
        if (!StringUtils.hasText(idToken)) {
            throw new AuthenticationFailedException("Google ID token is required");
        }

        JWTClaimsSet claimsSet;
        try {
            claimsSet = jwtProcessor.process(idToken, null);
        } catch (Exception ex) {
            throw new AuthenticationFailedException("Invalid Google ID token");
        }

        validateClaims(claimsSet);

        String subject = claimsSet.getSubject();
        String email;
        String name;
        try {
            email = claimsSet.getStringClaim("email");
            name = claimsSet.getStringClaim("name");
        } catch (ParseException ex) {
            throw new AuthenticationFailedException("Google token payload is malformed");
        }

        if (!StringUtils.hasText(subject) || !StringUtils.hasText(email)) {
            throw new AuthenticationFailedException("Google token payload is incomplete");
        }

        return new GoogleTokenPayload(subject, email, name, expectedClientId);
    }

    private void validateClaims(JWTClaimsSet claimsSet) {
        if (!VALID_ISSUERS.contains(claimsSet.getIssuer())) {
            throw new AuthenticationFailedException("Google token issuer is invalid");
        }

        if (claimsSet.getAudience() == null || !claimsSet.getAudience().contains(expectedClientId)) {
            throw new AuthenticationFailedException("Google token audience mismatch");
        }

        Instant now = Instant.now();
        Date expiresAt = claimsSet.getExpirationTime();
        Date issuedAt = claimsSet.getIssueTime();

        if (expiresAt == null || expiresAt.toInstant().isBefore(now)) {
            throw new AuthenticationFailedException("Google token has expired");
        }
        if (issuedAt != null && issuedAt.toInstant().isAfter(now.plusSeconds(60))) {
            throw new AuthenticationFailedException("Google token issue time is invalid");
        }
    }

    private ConfigurableJWTProcessor<SecurityContext> buildJwtProcessor() {
        try {
            URL jwkSetUrl = URI.create("https://www.googleapis.com/oauth2/v3/certs").toURL();
            JWKSource<SecurityContext> keySource = JWKSourceBuilder.create(jwkSetUrl).build();
            JWSKeySelector<SecurityContext> keySelector =
                    new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);

            ConfigurableJWTProcessor<SecurityContext> jwtProcessor = new DefaultJWTProcessor<>();
            jwtProcessor.setJWSKeySelector(keySelector);
            return jwtProcessor;
        } catch (MalformedURLException ex) {
            throw new IllegalStateException("Invalid Google JWK set URL", ex);
        }
    }

    public record GoogleTokenPayload(
            String sub,
            String email,
            String name,
            @JsonProperty("aud") String audience
    ) {
    }
}

