package io.neo4flix.user.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.neo4flix.common.error.UnauthorizedException;
import io.neo4flix.common.security.JwtProperties;
import io.neo4flix.common.security.JwtTokenService;
import io.neo4flix.user.api.dto.LoginRequest;
import io.neo4flix.user.api.dto.TokenResponse;
import io.neo4flix.user.api.dto.UserDto;
import io.neo4flix.user.domain.User;
import io.neo4flix.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwt;
    private final JwtProperties jwtProps;

    public TokenResponse login(LoginRequest req) {
        User user = users.findByUsername(req.usernameOrEmail())
                .or(() -> users.findByEmail(req.usernameOrEmail()))
                // Erreur générique : ne pas révéler si l'username existe ou non
                .orElseThrow(() -> new UnauthorizedException("Identifiants invalides"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Identifiants invalides");
        }

        return buildTokens(user);
    }

    public TokenResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwt.parse(refreshToken);
        } catch (JwtException e) {
            throw new UnauthorizedException("Refresh token invalide ou expiré");
        }
        if (!jwt.isRefreshToken(claims)) {
            throw new UnauthorizedException("Token fourni n'est pas un refresh token");
        }
        User user = users.findById(claims.getSubject())
                .orElseThrow(() -> new UnauthorizedException("User introuvable"));

        return buildTokens(user);
    }

    private TokenResponse buildTokens(User user) {
        String access = jwt.issueAccessToken(user.getId(), user.getUsername());
        String refresh = jwt.issueRefreshToken(user.getId(), user.getUsername());
        return TokenResponse.bearer(access, refresh,
                jwtProps.accessTokenTtl().toSeconds(),
                UserDto.from(user));
    }
}
