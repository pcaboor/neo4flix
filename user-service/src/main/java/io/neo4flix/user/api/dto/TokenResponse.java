package io.neo4flix.user.api.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        UserDto user
) {
    public static TokenResponse bearer(String access, String refresh,
                                       long expiresInSeconds, UserDto user) {
        return new TokenResponse(access, refresh, "Bearer", expiresInSeconds, user);
    }
}
