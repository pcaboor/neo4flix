package io.neo4flix.common.error;

/**
 * Levée quand une ressource (Movie, User, etc.) n'existe pas.
 * Mappée en HTTP 404 par le GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, String id) {
        super("%s with id '%s' not found".formatted(resource, id));
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
