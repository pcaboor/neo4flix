package io.neo4flix.common.error;

/**
 * Levée pour un conflit (duplicate key, etc.). Mappée en HTTP 409.
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
