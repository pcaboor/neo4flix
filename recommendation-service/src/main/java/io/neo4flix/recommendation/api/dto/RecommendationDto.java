package io.neo4flix.recommendation.api.dto;

import java.util.List;

/**
 * Une recommandation : un film + un score interne + une explication lisible.
 *
 * Le score n'a pas de sémantique unique : sa signification dépend de la stratégie
 * (note moyenne, nombre de friends qui l'ont aimé, similarité, etc.).
 * On l'expose pour l'UX (afficher "★ 4.6" ou "12 amis ont aimé") et le tri côté client.
 */
public record RecommendationDto(
        String movieId,
        String title,
        Integer releaseYear,
        String posterUrl,
        List<String> genres,
        Double score,
        String reason
) {}
