package io.neo4flix.rating.service;

import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.rating.api.dto.MovieRatingStats;
import io.neo4flix.rating.api.dto.RatingDto;
import io.neo4flix.rating.repository.RatingQueries;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingQueries queries;

    @Transactional
    public RatingDto rate(String userId, String movieId, int score) {
        if (!queries.userExists(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
        if (!queries.movieExists(movieId)) {
            throw new ResourceNotFoundException("Movie", movieId);
        }
        return queries.upsert(userId, movieId, score);
    }

    public RatingDto findOne(String userId, String movieId) {
        return queries.findOne(userId, movieId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Rating user=%s movie=%s".formatted(userId, movieId)));
    }

    public List<RatingDto> findByUser(String userId) {
        if (!queries.userExists(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
        return queries.findByUser(userId);
    }

    public List<RatingDto> findByMovie(String movieId) {
        if (!queries.movieExists(movieId)) {
            throw new ResourceNotFoundException("Movie", movieId);
        }
        return queries.findByMovie(movieId);
    }

    public MovieRatingStats stats(String movieId) {
        if (!queries.movieExists(movieId)) {
            throw new ResourceNotFoundException("Movie", movieId);
        }
        return queries.stats(movieId);
    }

    @Transactional
    public void delete(String userId, String movieId) {
        boolean deleted = queries.delete(userId, movieId);
        if (!deleted) {
            throw new ResourceNotFoundException(
                    "Rating user=%s movie=%s".formatted(userId, movieId));
        }
    }
}
