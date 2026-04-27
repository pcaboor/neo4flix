package io.neo4flix.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

/**
 * Service unique pour émettre et valider des tokens JWT.
 * Utilisé par auth (user-service) pour émettre, par tous les services
 * (via JwtAuthenticationFilter) pour valider.
 */
@Service
@RequiredArgsConstructor
public class JwtTokenService {

    private static final String CLAIM_USERNAME = "username";
    private static final String CLAIM_TOKEN_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";
    /** Token court (5 min) émis quand le password est OK mais le 2FA reste à vérifier. */
    public static final String TYPE_2FA_PENDING = "2fa_pending";
    private static final long TWO_FA_PENDING_TTL_MS = 5 * 60 * 1000L;

    private final JwtProperties props;

    private SecretKey key() {
        // HS256 demande une clé d'au moins 256 bits (32 octets).
        // On échoue tôt si l'admin a configuré un secret trop court.
        byte[] bytes = props.secret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "neo4flix.security.jwt.secret doit faire au moins 32 caractères");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String issueAccessToken(String userId, String username) {
        return issue(userId, username, TYPE_ACCESS, props.accessTokenTtl().toMillis());
    }

    public String issueRefreshToken(String userId, String username) {
        return issue(userId, username, TYPE_REFRESH, props.refreshTokenTtl().toMillis());
    }

    /** Ticket court (5 min) à présenter à /auth/login/2fa avec le code TOTP. */
    public String issue2faPendingToken(String userId, String username) {
        return issue(userId, username, TYPE_2FA_PENDING, TWO_FA_PENDING_TTL_MS);
    }

    private String issue(String userId, String username, String type, long ttlMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .issuer(props.issuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(ttlMs)))
                .claims(Map.of(
                        CLAIM_USERNAME, username,
                        CLAIM_TOKEN_TYPE, type))
                .signWith(key())
                .compact();
    }

    /**
     * Parse + valide signature + expiration. Throw JwtException si invalide.
     */
    public Claims parse(String token) throws JwtException {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key())
                .requireIssuer(props.issuer())
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return TYPE_ACCESS.equals(claims.get(CLAIM_TOKEN_TYPE));
    }

    public boolean isRefreshToken(Claims claims) {
        return TYPE_REFRESH.equals(claims.get(CLAIM_TOKEN_TYPE));
    }

    public boolean is2faPendingToken(Claims claims) {
        return TYPE_2FA_PENDING.equals(claims.get(CLAIM_TOKEN_TYPE));
    }

    public String getUsername(Claims claims) {
        return claims.get(CLAIM_USERNAME, String.class);
    }
}
