package io.neo4flix.user.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record Login2faRequest(
        @NotBlank String ticket,
        @Pattern(regexp = "\\d{6}", message = "code doit faire exactement 6 chiffres")
        String code
) {}
