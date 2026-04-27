package io.neo4flix.movie.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body pour PUT /movies/{id} — remplacement complet : tous les champs requis.
 * (Pour le partiel, voir PATCH avec PatchMovieRequest plus bas.)
 */
public record UpdateMovieRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull @Min(1888) Integer releaseYear,
        @Positive Integer duration,
        @Size(max = 2000) String description,
        @Size(max = 1000) String posterUrl,
        List<@NotBlank String> genres,
        List<@NotBlank String> directorIds
) {}
