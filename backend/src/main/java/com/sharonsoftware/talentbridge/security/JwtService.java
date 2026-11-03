package com.sharonsoftware.talentbridge.security;

import com.sharonsoftware.talentbridge.config.JwtProperties;
import com.sharonsoftware.talentbridge.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "token_type";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(properties.secret()));
    }

    public TokenPair issueTokenPair(User user) {
        Instant now = Instant.now();
        String accessToken = issueToken(user, ACCESS, now, properties.accessTokenTtl());
        String refreshToken = issueToken(user, REFRESH, now, properties.refreshTokenTtl());
        return new TokenPair(accessToken, refreshToken, properties.accessTokenTtl().toSeconds());
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return ACCESS.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return REFRESH.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
    }

    private String issueToken(User user, String tokenType, Instant issuedAt, Duration ttl) {
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("role", user.getRole().name())
                .claim(TOKEN_TYPE_CLAIM, tokenType)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(issuedAt.plus(ttl)))
                .signWith(signingKey)
                .compact();
    }

    public record TokenPair(String accessToken, String refreshToken, long expiresIn) {
    }
}