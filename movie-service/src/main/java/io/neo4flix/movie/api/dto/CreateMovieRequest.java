package io.neo4flix.movie.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body attendu pour POST /movies.
 * Les annotations Jakarta Validation sont vérifiées par Spring quand
 * le paramètre est annoté @Valid dans le controller.
 */
public record CreateMovieRequest(
        @NotBlank(message = "title est obligatoire")
        @Size(max = 200)
        String title,

        @NotNull
        @Min(value = 1888, message = "releaseYear doit être >= 1888 (premier film de l'histoire)")
        Integer releaseYear,

        @Positive
        Integer duration,

        @Size(max = 2000)
        String description,

        @Size(max = 1000)
        String posterUrl,

        /** Noms des genres — créés à la volée s'ils n'existent pas */
        List<@NotBlank String> genres,

        /** IDs des réalisateurs — doivent déjà exister */
        List<@NotBlank String> directorIds
) {}
