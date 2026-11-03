package com.sharonsoftware.talentbridge.service;

import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import com.sharonsoftware.talentbridge.security.JwtService;
import com.sharonsoftware.talentbridge.security.JwtService.TokenPair;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public TokenPair register(String email, String password, String firstName, String lastName) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new EmailAlreadyRegisteredException();
        }
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setRole(Role.STUDENT);
        return jwtService.issueTokenPair(userRepository.save(user));
    }

    public TokenPair login(String email, String password) {
        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(account -> passwordEncoder.matches(password, account.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return jwtService.issueTokenPair(user);
    }

    public TokenPair refresh(String token) {
        Claims claims;
        try {
            claims = jwtService.parse(token);
        } catch (JwtException | IllegalArgumentException exception) {
            throw new BadCredentialsException("Invalid refresh token", exception);
        }
        if (!jwtService.isRefreshToken(claims)) {
            throw new BadCredentialsException("Invalid refresh token");
        }
        UUID userId;
        try {
            userId = UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new BadCredentialsException("Invalid refresh token", exception);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        return jwtService.issueTokenPair(user);
    }

    public static class EmailAlreadyRegisteredException extends RuntimeException {
    }
}