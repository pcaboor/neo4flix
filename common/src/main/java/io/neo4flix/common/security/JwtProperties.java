package io.neo4flix.common.security;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Propriétés JWT lues depuis application.yml (préfixe "neo4flix.security.jwt").
 * @ConfigurationProperties + @EnableConfigurationProperties → binding automatique.
 *
 * Le secret doit être identique sur tous les microservices, sinon une signature
 * émise par user-service sera rejetée par movie-service. Pour la prod : RS256
 * (clé privée pour signer dans auth, clé publique partagée pour vérifier).
 */
@ConfigurationProperties(prefix = "neo4flix.security.jwt")
public record JwtProperties(
        @NotBlank String secret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl,
        String issuer
) {
    public JwtProperties {
        if (accessTokenTtl == null) accessTokenTtl = Duration.ofHours(1);
        if (refreshTokenTtl == null) refreshTokenTtl = Duration.ofDays(30);
        if (issuer == null) issuer = "neo4flix";
    }
}
