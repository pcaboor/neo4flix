package io.neo4flix.recommendation.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import java.time.Instant;

/**
 * Snapshot d'une liste de recommandations partagée.
 *
 * Le `token` est l'identifiant URL — non guessable (24 octets random base64).
 * Le contenu (`itemsJson`) est gelé au moment du partage : si l'owner change
 * ses notes ensuite, le lien continue à montrer la liste d'origine.
 *
 * Pas de relation @Relationship vers User : on stocke ownerId/ownerUsername
 * en propriétés. Recommandation-service ne possède pas l'entité User.
 */
@Node("SharedRecommendation")
@Getter
@Setter
@NoArgsConstructor
public class SharedRecommendation {

    @Id
    private String token;

    private String ownerId;
    private String ownerUsername;
    private String strategy;       // "by-genre" | "collaborative" | "from-following"

    /** Liste sérialisée en JSON (Neo4j ne supporte pas les listes d'objets). */
    private String itemsJson;

    private Instant createdAt;
}
