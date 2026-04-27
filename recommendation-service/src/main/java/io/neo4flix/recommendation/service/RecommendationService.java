package io.neo4flix.recommendation.service;

import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.recommendation.api.dto.RecommendationDto;
import io.neo4flix.recommendation.repository.RecommendationQueries;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationQueries queries;

    public List<RecommendationDto> byGenre(String userId, int limit) {
        ensureUserExists(userId);
        return queries.byGenrePreference(userId, limit);
    }

    public List<RecommendationDto> collaborative(String userId, int limit) {
        ensureUserExists(userId);
        return queries.collaborative(userId, limit);
    }

    public List<RecommendationDto> similarTo(String movieId, int limit) {
        return queries.similarTo(movieId, limit);
    }

    public List<RecommendationDto> fromFollowing(String userId, int limit) {
        ensureUserExists(userId);
        return queries.fromFollowing(userId, limit);
    }

    private void ensureUserExists(String userId) {
        if (!queries.userExists(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
    }
}
