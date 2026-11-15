package com.shoes.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtTokenProvider(@Value("${jwt.secret}") String base64Secret,
                            @Value("${jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(base64Secret));
        this.expirationMs = expirationMs;
    }

    public String createToken(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
            .map(authority -> authority.getAuthority()).toList();
        Date now = new Date();
        return Jwts.builder().setSubject(authentication.getName()).claim("roles", roles)
            .setIssuedAt(now).setExpiration(new Date(now.getTime() + expirationMs))
            .signWith(signingKey).compact();
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder().setSigningKey(signingKey).build().parseClaimsJws(token).getBody();
    }
}
