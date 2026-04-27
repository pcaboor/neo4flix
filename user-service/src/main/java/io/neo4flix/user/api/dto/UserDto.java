package io.neo4flix.user.api.dto;

import io.neo4flix.user.domain.User;

import java.time.Instant;

/**
 * DTO public — passwordHash JAMAIS exposé.
 * twoFactorEnabled est exposé pour que le frontend puisse afficher le bon
 * état dans le profil. Le secret TOTP, lui, ne sort jamais de l'API.
 */
public record UserDto(
        String id,
        String username,
        String email,
        Instant createdAt,
        boolean twoFactorEnabled
) {
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getUsername(), u.getEmail(),
                u.getCreatedAt(), u.isTwoFactorEnabled());
    }
}
