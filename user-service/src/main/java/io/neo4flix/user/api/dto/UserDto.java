package io.neo4flix.user.api.dto;

import io.neo4flix.user.domain.User;

import java.time.Instant;

/**
 * DTO public — passwordHash JAMAIS exposé.
 */
public record UserDto(
        String id,
        String username,
        String email,
        Instant createdAt
) {
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getCreatedAt());
    }
}
