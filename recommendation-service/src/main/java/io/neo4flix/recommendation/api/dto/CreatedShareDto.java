package io.neo4flix.recommendation.api.dto;

/**
 * Réponse au POST /shares — juste de quoi construire le lien à partager.
 */
public record CreatedShareDto(
        String token,
        String url
) {}
