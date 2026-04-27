package io.neo4flix.rating.api.dto;

/**
 * Stats agrégées d'un film.
 */
public record MovieRatingStats(
        String movieId,
        long count,
        double average
) {}
