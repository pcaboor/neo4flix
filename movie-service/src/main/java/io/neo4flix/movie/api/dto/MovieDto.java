package io.neo4flix.movie.api.dto;

import io.neo4flix.movie.domain.Movie;

import java.util.List;

/**
 * DTO de sortie : ce qu'on expose au client REST.
 * On ne renvoie JAMAIS l'entité Neo4j directement (couplage + risques de fuites).
 */
public record MovieDto(
        String id,
        String title,
        Integer releaseYear,
        Integer duration,
        String description,
        String posterUrl,
        List<String> genres,
        List<String> directors
) {
    public static MovieDto from(Movie m) {
        return new MovieDto(
                m.getId(),
                m.getTitle(),
                m.getReleaseYear(),
                m.getDuration(),
                m.getDescription(),
                m.getPosterUrl(),
                m.getGenres().stream().map(g -> g.getName()).sorted().toList(),
                m.getDirectors().stream().map(d -> d.getName()).sorted().toList()
        );
    }
}
