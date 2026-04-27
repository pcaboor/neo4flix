package io.neo4flix.movie.repository;

import io.neo4flix.movie.domain.Genre;
import org.springframework.data.neo4j.repository.Neo4jRepository;

public interface GenreRepository extends Neo4jRepository<Genre, String> {
    // Genre est identifié par son nom (@Id sur name)
    // → findById(name) suffit pour rechercher
}
