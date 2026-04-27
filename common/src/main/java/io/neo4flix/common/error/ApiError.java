package io.neo4flix.common.error;

import java.time.Instant;
import java.util.List;

/**
 * Format d'erreur standard renvoyé par tous les microservices.
 * Record Java : génère automatiquement constructeur, getters, equals, hashCode, toString.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<String> details
) {
    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path, List.of());
    }

    public static ApiError of(int status, String error, String message, String path, List<String> details) {
        return new ApiError(Instant.now(), status, error, message, path, details);
    }
}
