package io.neo4flix.user.api.dto;

import jakarta.validation.constraints.Pattern;

/**
 * Body utilisé pour /auth/2fa/enable et /auth/2fa/disable.
 * Code TOTP à 6 chiffres.
 */
public record TwoFactorCodeRequest(
        @Pattern(regexp = "\\d{6}", message = "code doit faire exactement 6 chiffres")
        String code
) {}
