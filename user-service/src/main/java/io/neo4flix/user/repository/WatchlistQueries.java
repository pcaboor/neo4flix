package io.neo4flix.user.repository;

import io.neo4flix.user.api.dto.WatchlistItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Requêtes custom mappées sur des records via Neo4jClient.
 * Plus flexible qu'un Neo4jRepository<T,ID> quand on veut projeter
 * des données sur un DTO et non sur une entité @Node.
 */
@Component
@RequiredArgsConstructor
public class WatchlistQueries {

    private final Neo4jClient client;

    public List<WatchlistItemDto> findWatchlist(String userId) {
        String cypher = """
                MATCH (:User {id: $userId})-[w:WATCHLIST]->(m:Movie)
                RETURN m.id AS id, m.title AS title, m.releaseYear AS releaseYear,
                       m.posterUrl AS posterUrl, w.addedAt AS addedAt
                ORDER BY w.addedAt DESC
                """;
        return client
                .query(cypher)
                .bind(userId).to("userId")
                .fetchAs(WatchlistItemDto.class)
                .mappedBy((typeSystem, record) -> new WatchlistItemDto(
                        record.get("id").asString(null),
                        record.get("title").asString(null),
                        record.get("releaseYear").asInt(),
                        record.get("posterUrl").isNull() ? null : record.get("posterUrl").asString(),
                        record.get("addedAt").isNull() ? null : record.get("addedAt").asZonedDateTime()
                ))
                .all()
                .stream()
                .toList();
    }
}
