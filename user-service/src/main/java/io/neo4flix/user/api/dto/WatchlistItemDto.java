package io.neo4flix.user.api.dto;

import java.time.ZonedDateTime;

/**
 * Vue plate d'un film en watchlist.
 * user-service ne connaît pas l'entité Movie complète — il projette
 * juste les champs nécessaires depuis Cypher.
 */
public record WatchlistItemDto(
        String id,
        String title,
        Integer releaseYear,
        String posterUrl,
        ZonedDateTime addedAt
) {}
