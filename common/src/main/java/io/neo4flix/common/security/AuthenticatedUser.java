package io.neo4flix.common.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;

import java.util.List;

/**
 * Notre Authentication custom. Le principal est l'id du user (String),
 * récupérable via SecurityContextHolder.getContext().getAuthentication().getName().
 */
public class AuthenticatedUser extends AbstractAuthenticationToken {

    private final String userId;
    private final String username;

    public AuthenticatedUser(String userId, String username) {
        super(List.of()); // pas de rôles pour l'instant
        this.userId = userId;
        this.username = username;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null; // jamais de credentials une fois authentifié
    }

    @Override
    public Object getPrincipal() {
        return userId;
    }

    @Override
    public String getName() {
        return userId;
    }

    public String getUsername() {
        return username;
    }
}
