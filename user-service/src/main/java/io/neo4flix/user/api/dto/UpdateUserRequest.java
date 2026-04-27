package io.neo4flix.user.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Mise à jour partielle. Tous les champs optionnels (null = "ne pas modifier").
 * Le mot de passe est traité à part via PUT /users/{id}/password.
 */
public record UpdateUserRequest(
        @Size(min = 3, max = 30)
        @Pattern(regexp = "^[a-zA-Z0-9_.-]+$")
        String username,

        @Email
        @Size(max = 200)
        String email
) {}
