package io.neo4flix.movie.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body pour PATCH /movies/{id} — remplacement partiel.
 * Tous les champs sont optionnels : seuls les champs non-null sont appliqués.
 * (NB : Avec record, distinguer "non fourni" de "fourni à null" demande JsonNullable —
 *  on garde simple ici, null = "ne pas modifier".)
 */
public record PatchMovieRequest(
        @Size(max = 200) String title,
        @Min(1888) Integer releaseYear,
        @Positive Integer duration,
        @Size(max = 2000) String description,
        @Size(max = 1000) String posterUrl,
        List<String> genres,
        List<String> directorIds
) {}
