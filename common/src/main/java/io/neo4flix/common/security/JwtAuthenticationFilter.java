package io.neo4flix.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtre qui s'exécute UNE fois par requête. Il :
 *  - lit le header Authorization: Bearer <token>
 *  - valide le JWT
 *  - place un AuthenticatedUser dans SecurityContextHolder
 *
 * En cas d'échec on n'envoie pas 401 nous-mêmes : on laisse le SecurityContext
 * vide → c'est SecurityFilterChain qui décide (401 si endpoint protégé).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenService jwt;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                Claims claims = jwt.parse(token);
                if (jwt.isAccessToken(claims)) {
                    String userId = claims.getSubject();
                    String username = jwt.getUsername(claims);
                    AuthenticatedUser auth = new AuthenticatedUser(userId, username);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
                // Si c'est un refresh token, on ne l'accepte pas comme auth → ignoré
            } catch (JwtException ignored) {
                // Token invalide / expiré : on laisse le SecurityContext vide
            }
        }
        chain.doFilter(request, response);
    }
}
