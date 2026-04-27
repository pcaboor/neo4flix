package io.neo4flix.user.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.neo4flix.common.error.ConflictException;
import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.common.error.UnauthorizedException;
import io.neo4flix.common.security.JwtProperties;
import io.neo4flix.common.security.JwtTokenService;
import io.neo4flix.user.api.dto.LoginRequest;
import io.neo4flix.user.api.dto.LoginResult;
import io.neo4flix.user.api.dto.TokenResponse;
import io.neo4flix.user.api.dto.TwoFactorSetupResponse;
import io.neo4flix.user.api.dto.UserDto;
import io.neo4flix.user.domain.User;
import io.neo4flix.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwt;
    private final JwtProperties jwtProps;
    private final TotpService totp;

    // ============================================================
    // Login
    // ============================================================

    public LoginResult login(LoginRequest req) {
        User user = users.findByUsername(req.usernameOrEmail())
                .or(() -> users.findByEmail(req.usernameOrEmail()))
                // Erreur générique : ne pas révéler si l'username existe ou non
                .orElseThrow(() -> new UnauthorizedException("Identifiants invalides"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Identifiants invalides");
        }

        // Si 2FA actif : on n'émet PAS de tokens. On renvoie un ticket à 5 min,
        // que le user présentera à /auth/login/2fa avec son code TOTP.
        if (user.isTwoFactorEnabled()) {
            String ticket = jwt.issue2faPendingToken(user.getId(), user.getUsername());
            return LoginResult.challenge(ticket);
        }

        return LoginResult.tokens(
                jwt.issueAccessToken(user.getId(), user.getUsername()),
                jwt.issueRefreshToken(user.getId(), user.getUsername()),
                jwtProps.accessTokenTtl().toSeconds(),
                UserDto.from(user));
    }

    /** 2ᵉ étape du login quand le user a activé le 2FA. */
    public TokenResponse loginWith2fa(String ticket, String code) {
        Claims claims;
        try {
            claims = jwt.parse(ticket);
        } catch (JwtException e) {
            throw new UnauthorizedException("Ticket 2FA invalide ou expiré");
        }
        if (!jwt.is2faPendingToken(claims)) {
            throw new UnauthorizedException("Token fourni n'est pas un ticket 2FA");
        }
        User user = users.findById(claims.getSubject())
                .orElseThrow(() -> new UnauthorizedException("User introuvable"));

        if (!user.isTwoFactorEnabled() || user.getTwoFactorSecret() == null) {
            throw new UnauthorizedException("2FA non activé pour ce compte");
        }
        if (!totp.verify(user.getTwoFactorSecret(), code)) {
            throw new UnauthorizedException("Code 2FA invalide");
        }
        return buildTokenResponse(user);
    }

    // ============================================================
    // Refresh
    // ============================================================

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

        return buildTokenResponse(user);
    }

    // ============================================================
    // 2FA — setup / enable / disable
    // ============================================================

    /**
     * Démarre l'enrôlement : génère un secret, le sauvegarde en attente,
     * renvoie le QR à scanner. Le 2FA reste désactivé jusqu'à enable().
     */
    @Transactional
    public TwoFactorSetupResponse setupTwoFactor(String userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        String secret = totp.generateSecret();
        user.setTwoFactorSecret(secret);
        // twoFactorEnabled reste à false : pas encore confirmé
        users.save(user);

        return new TwoFactorSetupResponse(
                secret,
                totp.buildProvisioningUri(user.getUsername(), secret),
                totp.buildQrCodeDataUri(user.getUsername(), secret)
        );
    }

    /** Confirme l'enrôlement avec un premier code. Active le 2FA. */
    @Transactional
    public void enableTwoFactor(String userId, String code) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (user.getTwoFactorSecret() == null) {
            throw new ConflictException("Aucun setup en cours — appelle d'abord /auth/2fa/setup");
        }
        if (user.isTwoFactorEnabled()) {
            throw new ConflictException("2FA déjà activé");
        }
        if (!totp.verify(user.getTwoFactorSecret(), code)) {
            throw new UnauthorizedException("Code invalide");
        }
        user.setTwoFactorEnabled(true);
        users.save(user);
    }

    /** Désactive le 2FA après vérification d'un dernier code. */
    @Transactional
    public void disableTwoFactor(String userId, String code) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (!user.isTwoFactorEnabled()) {
            throw new ConflictException("2FA non activé");
        }
        if (!totp.verify(user.getTwoFactorSecret(), code)) {
            throw new UnauthorizedException("Code invalide");
        }
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        users.save(user);
    }

    // ============================================================
    // Helpers
    // ============================================================

    private TokenResponse buildTokenResponse(User user) {
        String access = jwt.issueAccessToken(user.getId(), user.getUsername());
        String refresh = jwt.issueRefreshToken(user.getId(), user.getUsername());
        return TokenResponse.bearer(access, refresh,
                jwtProps.accessTokenTtl().toSeconds(),
                UserDto.from(user));
    }
}
