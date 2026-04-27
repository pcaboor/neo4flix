package io.neo4flix.recommendation.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Recommandation-service ne possède pas l'entité User mais a besoin de
 * récupérer le username pour l'attacher à un SharedRecommendation.
 * Lookup direct via Cypher.
 */
@Component
@RequiredArgsConstructor
public class UsernameLookup {

    private final Neo4jClient client;

    public Optional<String> findUsername(String userId) {
        return client.query("MATCH (u:User {id: $id}) RETURN u.username AS name")
                .bind(userId).to("id")
                .fetchAs(String.class)
                .mappedBy((ts, rec) -> rec.get("name").asString())
                .one();
    }
}
