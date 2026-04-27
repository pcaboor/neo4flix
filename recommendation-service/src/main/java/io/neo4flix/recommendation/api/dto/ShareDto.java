package io.neo4flix.recommendation.api.dto;

import java.time.Instant;
import java.util.List;

/**
 * Objet retourné par GET /shares/{token} (public).
 * Ne contient PAS l'ownerId interne — juste le username.
 */
public record ShareDto(
        String token,
        String ownerUsername,
        String strategy,
        List<RecommendationDto> items,
        Instant createdAt
) {}
