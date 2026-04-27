package io.neo4flix.rating.api.dto;

import java.time.ZonedDateTime;

/**
 * Représente une note (relation RATED) avec ses extrémités.
 */
public record RatingDto(
        String userId,
        String username,
        String movieId,
        String movieTitle,
        Integer score,
        ZonedDateTime ratedAt
) {}
