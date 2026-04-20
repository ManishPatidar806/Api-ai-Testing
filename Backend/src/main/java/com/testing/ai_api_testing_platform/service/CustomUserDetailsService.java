package com.testing.ai_api_testing_platform.service;

import com.testing.ai_api_testing_platform.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        com.testing.ai_api_testing_platform.domain.entity.User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found for email: " + username));

        String password = user.getPasswordHash() == null ? "" : user.getPasswordHash();

        return new UserDetailPrincipal(
                user.getEmail(),
                password,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
        );
    }
}

