package io.neo4flix.user.repository;

import io.neo4flix.user.domain.User;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends Neo4jRepository<User, String> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByUsernameContainingIgnoreCase(String fragment);

    // ============================================================
    // Watchlist (création/suppression — la lecture passe par Neo4jClient
    // dans WatchlistQueries pour mapper proprement vers WatchlistItemDto)
    // ============================================================

    @Query("""
            MATCH (u:User {id: $userId}), (m:Movie {id: $movieId})
            MERGE (u)-[w:WATCHLIST]->(m)
            ON CREATE SET w.addedAt = datetime()
            RETURN count(w) AS created
            """)
    long addToWatchlist(@Param("userId") String userId, @Param("movieId") String movieId);

    @Query("""
            MATCH (:User {id: $userId})-[w:WATCHLIST]->(:Movie {id: $movieId})
            DELETE w
            """)
    void removeFromWatchlist(@Param("userId") String userId, @Param("movieId") String movieId);

    // ============================================================
    // Follows
    // ============================================================

    @Query("""
            MATCH (a:User {id: $followerId}), (b:User {id: $followedId})
            WHERE a <> b
            MERGE (a)-[f:FOLLOWS]->(b)
            ON CREATE SET f.since = datetime()
            RETURN count(f) AS created
            """)
    long follow(@Param("followerId") String followerId, @Param("followedId") String followedId);

    @Query("""
            MATCH (:User {id: $followerId})-[f:FOLLOWS]->(:User {id: $followedId})
            DELETE f
            """)
    void unfollow(@Param("followerId") String followerId, @Param("followedId") String followedId);

    @Query("""
            MATCH (:User {id: $userId})-[:FOLLOWS]->(other:User)
            RETURN other
            ORDER BY other.username
            """)
    List<User> findFollowing(@Param("userId") String userId);

    @Query("""
            MATCH (:User {id: $userId})<-[:FOLLOWS]-(other:User)
            RETURN other
            ORDER BY other.username
            """)
    List<User> findFollowers(@Param("userId") String userId);
}
