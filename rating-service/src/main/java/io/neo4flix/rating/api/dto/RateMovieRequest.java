package io.neo4flix.rating.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RateMovieRequest(
        @NotNull
        @Min(value = 1, message = "score doit être entre 1 et 5")
        @Max(value = 5, message = "score doit être entre 1 et 5")
        Integer score
) {}
