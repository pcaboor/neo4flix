package io.neo4flix.movie.repository;

import io.neo4flix.movie.domain.Movie;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Repository Spring Data Neo4j.
 * Méthodes simples : générées automatiquement à partir du nom.
 * Méthodes complexes : annotées @Query avec du Cypher manuel.
 */
public interface MovieRepository extends Neo4jRepository<Movie, String> {

    /** Auto-générée : SELECT * FROM Movie WHERE releaseYear = ? */
    List<Movie> findByReleaseYear(Integer year);

    /** Auto-générée : recherche insensible à la casse, contient */
    List<Movie> findByTitleContainingIgnoreCase(String fragment);

    /**
     * Films d'un genre donné — Cypher explicite pour montrer la syntaxe.
     * Le @Query est utile dès qu'on traverse plus d'une relation.
     */
    @Query("""
            MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre {name: $genreName})
            RETURN m
            ORDER BY m.releaseYear DESC
            """)
    List<Movie> findByGenre(@Param("genreName") String genreName);

    /**
     * Supprime les relations BELONGS_TO d'un film.
     * À appeler avant save() pour remplacer (et non additionner) les genres.
     */
    @Query("""
            MATCH (:Movie {id: $id})-[r:BELONGS_TO]->()
            DELETE r
            """)
    void detachGenres(@Param("id") String id);

    /** Supprime les relations DIRECTED_BY d'un film. */
    @Query("""
            MATCH (:Movie {id: $id})-[r:DIRECTED_BY]->()
            DELETE r
            """)
    void detachDirectors(@Param("id") String id);
}
