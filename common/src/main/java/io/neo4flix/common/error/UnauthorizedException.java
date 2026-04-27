package io.neo4flix.common.error;

/**
 * Levée quand des credentials sont invalides. Mappée en HTTP 401.
 */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
