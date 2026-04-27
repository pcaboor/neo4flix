package io.neo4flix.movie.repository;

import io.neo4flix.movie.domain.Director;
import org.springframework.data.neo4j.repository.Neo4jRepository;

public interface DirectorRepository extends Neo4jRepository<Director, String> {
}
