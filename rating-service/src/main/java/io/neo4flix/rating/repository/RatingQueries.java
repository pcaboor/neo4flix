package io.neo4flix.rating.repository;

import io.neo4flix.rating.api.dto.MovieRatingStats;
import io.neo4flix.rating.api.dto.RatingDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Toutes les requêtes du rating-service. Pas d'entité Spring Data Neo4j ici :
 * - une "note" est une relation (User)-[:RATED]->(Movie), pas un nœud
 * - on projette directement Cypher → record DTO via Neo4jClient
 */
@Component
@RequiredArgsConstructor
public class RatingQueries {

    private final Neo4jClient client;

    // ============================================================
    // Vérifications d'existence
    // ============================================================

    public boolean userExists(String userId) {
        return existsBy("User", "id", userId);
    }

    public boolean movieExists(String movieId) {
        return existsBy("Movie", "id", movieId);
    }

    private boolean existsBy(String label, String prop, String value) {
        return client.query("MATCH (n:" + label + " {" + prop + ": $v}) RETURN count(n) > 0 AS exists")
                .bind(value).to("v")
                .fetchAs(Boolean.class)
                .one()
                .orElse(false);
    }

    // ============================================================
    // Création / mise à jour d'une note (idempotent)
    // ============================================================

    public RatingDto upsert(String userId, String movieId, int score) {
        String cypher = """
                MATCH (u:User {id: $userId}), (m:Movie {id: $movieId})
                MERGE (u)-[r:RATED]->(m)
                SET r.score = $score, r.ratedAt = datetime()
                RETURN u.id AS userId, u.username AS username,
                       m.id AS movieId, m.title AS movieTitle,
                       r.score AS score, r.ratedAt AS ratedAt
                """;
        return client.query(cypher)
                .bindAll(java.util.Map.of(
                        "userId", userId,
                        "movieId", movieId,
                        "score", score))
                .fetchAs(RatingDto.class)
                .mappedBy((ts, rec) -> new RatingDto(
                        rec.get("userId").asString(),
                        rec.get("username").asString(),
                        rec.get("movieId").asString(),
                        rec.get("movieTitle").asString(),
                        rec.get("score").asInt(),
                        rec.get("ratedAt").asZonedDateTime()
                ))
                .one()
                .orElseThrow(() -> new IllegalStateException("MERGE devrait toujours retourner un résultat"));
    }

    // ============================================================
    // Lecture
    // ============================================================

    public Optional<RatingDto> findOne(String userId, String movieId) {
        String cypher = """
                MATCH (u:User {id: $userId})-[r:RATED]->(m:Movie {id: $movieId})
                RETURN u.id AS userId, u.username AS username,
                       m.id AS movieId, m.title AS movieTitle,
                       r.score AS score, r.ratedAt AS ratedAt
                """;
        return client.query(cypher)
                .bindAll(java.util.Map.of("userId", userId, "movieId", movieId))
                .fetchAs(RatingDto.class)
                .mappedBy(this::mapRating)
                .one();
    }

    public List<RatingDto> findByUser(String userId) {
        String cypher = """
                MATCH (u:User {id: $userId})-[r:RATED]->(m:Movie)
                RETURN u.id AS userId, u.username AS username,
                       m.id AS movieId, m.title AS movieTitle,
                       r.score AS score, r.ratedAt AS ratedAt
                ORDER BY r.ratedAt DESC
                """;
        return client.query(cypher)
                .bind(userId).to("userId")
                .fetchAs(RatingDto.class)
                .mappedBy(this::mapRating)
                .all()
                .stream().toList();
    }

    public List<RatingDto> findByMovie(String movieId) {
        String cypher = """
                MATCH (u:User)-[r:RATED]->(m:Movie {id: $movieId})
                RETURN u.id AS userId, u.username AS username,
                       m.id AS movieId, m.title AS movieTitle,
                       r.score AS score, r.ratedAt AS ratedAt
                ORDER BY r.ratedAt DESC
                """;
        return client.query(cypher)
                .bind(movieId).to("movieId")
                .fetchAs(RatingDto.class)
                .mappedBy(this::mapRating)
                .all()
                .stream().toList();
    }

    public MovieRatingStats stats(String movieId) {
        String cypher = """
                MATCH (m:Movie {id: $movieId})
                OPTIONAL MATCH (m)<-[r:RATED]-(:User)
                RETURN m.id AS movieId,
                       count(r) AS count,
                       coalesce(avg(r.score), 0.0) AS average
                """;
        return client.query(cypher)
                .bind(movieId).to("movieId")
                .fetchAs(MovieRatingStats.class)
                .mappedBy((ts, rec) -> new MovieRatingStats(
                        rec.get("movieId").asString(null),
                        rec.get("count").asLong(),
                        rec.get("average").asDouble()
                ))
                .one()
                .orElseThrow();
    }

    // ============================================================
    // Suppression
    // ============================================================

    public boolean delete(String userId, String movieId) {
        String cypher = """
                MATCH (:User {id: $userId})-[r:RATED]->(:Movie {id: $movieId})
                DELETE r
                RETURN count(r) AS deleted
                """;
        long deleted = client.query(cypher)
                .bindAll(java.util.Map.of("userId", userId, "movieId", movieId))
                .fetchAs(Long.class)
                .mappedBy((ts, rec) -> rec.get("deleted").asLong())
                .one()
                .orElse(0L);
        return deleted > 0;
    }

    // ============================================================
    // Helper privé
    // ============================================================

    private RatingDto mapRating(org.neo4j.driver.types.TypeSystem ts, org.neo4j.driver.Record rec) {
        return new RatingDto(
                rec.get("userId").asString(),
                rec.get("username").asString(),
                rec.get("movieId").asString(),
                rec.get("movieTitle").asString(),
                rec.get("score").asInt(),
                rec.get("ratedAt").asZonedDateTime()
        );
    }
}
