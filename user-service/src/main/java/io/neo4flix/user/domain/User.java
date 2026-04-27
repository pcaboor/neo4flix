package io.neo4flix.user.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import java.time.Instant;

/**
 * Entité User. Pas de @Relationship ici : les liens (FOLLOWS, WATCHLIST,
 * RATED) sont manipulés via Cypher direct dans le repository.
 *
 * Ce choix simplifie le service et évite les pièges de chargement/sauvegarde
 * de relations en cascade (cf. fix appliqué dans movie-service).
 */
@Node("User")
@Getter
@Setter
@NoArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
public class User {

    @Id
    @ToString.Include
    private String id;

    @ToString.Include
    private String username;

    @ToString.Include
    private String email;

    /** BCrypt hash. Jamais exposé en JSON (pas dans le DTO). */
    private String passwordHash;

    private Instant createdAt;

    /** 2FA TOTP — désactivé par défaut, opt-in. */
    private boolean twoFactorEnabled;

    /**
     * Secret TOTP en base32. Nullable jusqu'à activation.
     * En prod : chiffrer avec une clé de l'application (Vault / KMS).
     * Ici stocké en clair pour la démo (cf. doc).
     */
    private String twoFactorSecret;
}
