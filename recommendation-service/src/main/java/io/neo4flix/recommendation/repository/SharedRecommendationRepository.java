package io.neo4flix.recommendation.repository;

import io.neo4flix.recommendation.domain.SharedRecommendation;
import org.springframework.data.neo4j.repository.Neo4jRepository;

public interface SharedRecommendationRepository
        extends Neo4jRepository<SharedRecommendation, String> {
}
