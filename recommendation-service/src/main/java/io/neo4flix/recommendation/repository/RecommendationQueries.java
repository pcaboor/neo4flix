package io.neo4flix.recommendation.repository;

import io.neo4flix.recommendation.api.dto.RecommendationDto;
import lombok.RequiredArgsConstructor;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;
import org.neo4j.driver.types.TypeSystem;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Toutes les stratégies de recommandation passent par Cypher pur.
 * C'est la grande force de Neo4j : ces requêtes seraient cauchemardesques en SQL.
 */
@Component
@RequiredArgsConstructor
public class RecommendationQueries {

    private final Neo4jClient client;

    public boolean userExists(String userId) {
        return client.query("MATCH (u:User {id: $id}) RETURN count(u) > 0 AS exists")
                .bind(userId).to("id")
                .fetchAs(Boolean.class)
                .one()
                .orElse(false);
    }

    // ============================================================
    // 1. Recommandations basées sur les genres préférés
    //    "Tu aimes beaucoup la SF (note moyenne 4.5 sur les 3 SF que tu as
    //     notés) → voici d'autres SF que tu n'as pas encore vus"
    // ============================================================
    public List<RecommendationDto> byGenrePreference(String userId, int limit) {
        String cypher = """
                // Top 3 genres préférés du user
                MATCH (u:User {id: $userId})-[r:RATED]->(:Movie)-[:BELONGS_TO]->(g:Genre)
                WITH u, g, avg(r.score) AS preference, count(*) AS sampleSize
                WHERE sampleSize >= 1 AND preference >= 3.0
                // Important : ORDER BY / LIMIT en milieu de requête doivent être
                // attachés à un WITH (pas valides directement après un WHERE).
                WITH u, g, preference ORDER BY preference DESC LIMIT 3
                // Films de ces genres pas encore notés par u
                MATCH (g)<-[:BELONGS_TO]-(reco:Movie)
                WHERE NOT (u)-[:RATED]->(reco)
                OPTIONAL MATCH (reco)<-[r2:RATED]-(:User)
                OPTIONAL MATCH (reco)-[:BELONGS_TO]->(allG:Genre)
                WITH reco, g.name AS matchingGenre, preference,
                     coalesce(avg(r2.score), 0.0) AS avgRating,
                     collect(DISTINCT allG.name) AS allGenres
                RETURN reco.id AS movieId, reco.title AS title,
                       reco.releaseYear AS releaseYear, reco.posterUrl AS posterUrl,
                       allGenres AS genres,
                       avgRating AS score,
                       'Tu aimes "' + matchingGenre + '" — note moyenne ' +
                       toString(round(avgRating * 10) / 10.0) AS reason
                ORDER BY score DESC
                LIMIT $limit
                """;
        return run(cypher, Map.of("userId", userId, "limit", limit));
    }

    // ============================================================
    // 2. Collaborative filtering
    //    "Les utilisateurs qui notent les mêmes films comme toi ont aussi
    //     noté X très haut → voici X"
    // ============================================================
    public List<RecommendationDto> collaborative(String userId, int limit) {
        String cypher = """
                // Utilisateurs avec des goûts similaires : ils ont noté les mêmes films
                // avec des scores proches (écart <= 1)
                MATCH (me:User {id: $userId})-[r1:RATED]->(common:Movie)<-[r2:RATED]-(other:User)
                WHERE me <> other AND abs(r1.score - r2.score) <= 1
                WITH me, other, count(*) AS overlap
                WHERE overlap >= 1
                WITH me, other ORDER BY overlap DESC LIMIT 20
                // Leurs notes hautes sur des films que je n'ai pas vus
                MATCH (other)-[r:RATED]->(reco:Movie)
                WHERE NOT (me)-[:RATED]->(reco) AND r.score >= 4
                OPTIONAL MATCH (reco)-[:BELONGS_TO]->(g:Genre)
                WITH reco, avg(r.score) AS avgScore, count(DISTINCT other) AS hits,
                     collect(DISTINCT g.name) AS genres
                RETURN reco.id AS movieId, reco.title AS title,
                       reco.releaseYear AS releaseYear, reco.posterUrl AS posterUrl,
                       genres,
                       avgScore AS score,
                       toString(hits) + ' utilisateur(s) avec des goûts proches ont aimé' AS reason
                ORDER BY score DESC, hits DESC
                LIMIT $limit
                """;
        return run(cypher, Map.of("userId", userId, "limit", limit));
    }

    // ============================================================
    // 3. Films similaires à un film donné
    //    "Si tu as aimé Inception, regarde X qui partage les mêmes
    //     genres ET qui est noté de manière cohérente"
    // ============================================================
    public List<RecommendationDto> similarTo(String movieId, int limit) {
        String cypher = """
                MATCH (source:Movie {id: $movieId})-[:BELONGS_TO]->(g:Genre)<-[:BELONGS_TO]-(other:Movie)
                WHERE source <> other
                OPTIONAL MATCH (other)<-[r:RATED]-(:User)
                OPTIONAL MATCH (other)-[:BELONGS_TO]->(allG:Genre)
                WITH source, other,
                     count(DISTINCT g) AS sharedGenres,
                     coalesce(avg(r.score), 0.0) AS avgScore,
                     collect(DISTINCT allG.name) AS genres
                RETURN other.id AS movieId, other.title AS title,
                       other.releaseYear AS releaseYear, other.posterUrl AS posterUrl,
                       genres,
                       toFloat(sharedGenres) + (avgScore / 10.0) AS score,
                       toString(sharedGenres) + ' genre(s) en commun avec "' + source.title + '"' AS reason
                ORDER BY score DESC
                LIMIT $limit
                """;
        return run(cypher, Map.of("movieId", movieId, "limit", limit));
    }

    // ============================================================
    // 4. À partir des comptes suivis (FOLLOWS)
    //    "Les comptes que tu suis ont aimé X → tu pourrais aussi"
    // ============================================================
    public List<RecommendationDto> fromFollowing(String userId, int limit) {
        String cypher = """
                MATCH (me:User {id: $userId})-[:FOLLOWS]->(friend:User)-[r:RATED]->(reco:Movie)
                WHERE r.score >= 4 AND NOT (me)-[:RATED]->(reco)
                OPTIONAL MATCH (reco)-[:BELONGS_TO]->(g:Genre)
                WITH reco, avg(r.score) AS avgScore,
                     collect(DISTINCT friend.username) AS friendsWhoLiked,
                     collect(DISTINCT g.name) AS genres
                RETURN reco.id AS movieId, reco.title AS title,
                       reco.releaseYear AS releaseYear, reco.posterUrl AS posterUrl,
                       genres,
                       avgScore AS score,
                       'Aimé par ' + apoc.text.join(friendsWhoLiked, ', ') AS reason
                ORDER BY score DESC
                LIMIT $limit
                """;
        return run(cypher, Map.of("userId", userId, "limit", limit));
    }

    // ============================================================
    // Helper de mapping
    // ============================================================

    private List<RecommendationDto> run(String cypher, Map<String, Object> params) {
        return client.query(cypher)
                .bindAll(params)
                .fetchAs(RecommendationDto.class)
                .mappedBy(this::mapReco)
                .all()
                .stream().toList();
    }

    @SuppressWarnings("unused")
    private RecommendationDto mapReco(TypeSystem ts, Record rec) {
        Value posterV = rec.get("posterUrl");
        Value reasonV = rec.get("reason");
        return new RecommendationDto(
                rec.get("movieId").asString(),
                rec.get("title").asString(),
                rec.get("releaseYear").isNull() ? null : rec.get("releaseYear").asInt(),
                posterV.isNull() ? null : posterV.asString(),
                rec.get("genres").asList(Value::asString),
                rec.get("score").asDouble(),
                reasonV.isNull() ? null : reasonV.asString()
        );
    }
}
