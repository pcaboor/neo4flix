package io.neo4flix.recommendation.api.dto;

import jakarta.validation.constraints.Pattern;

public record CreateShareRequest(
        @Pattern(regexp = "by-genre|collaborative|from-following",
                 message = "strategy doit être l'une de : by-genre, collaborative, from-following")
        String strategy
) {}
