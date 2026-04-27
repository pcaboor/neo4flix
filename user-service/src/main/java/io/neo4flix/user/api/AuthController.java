package io.neo4flix.user.api;

import io.neo4flix.user.api.dto.Login2faRequest;
import io.neo4flix.user.api.dto.LoginRequest;
import io.neo4flix.user.api.dto.LoginResult;
import io.neo4flix.user.api.dto.RefreshTokenRequest;
import io.neo4flix.user.api.dto.TokenResponse;
import io.neo4flix.user.api.dto.TwoFactorCodeRequest;
import io.neo4flix.user.api.dto.TwoFactorSetupResponse;
import io.neo4flix.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService auth;

    // ============================================================
    // Login
    // ============================================================

    /**
     * Login. Renvoie soit les tokens directement (2FA off), soit un ticket
     * 2FA à présenter à /auth/login/2fa avec le code TOTP.
     */
    @PostMapping("/login")
    public LoginResult login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    /** 2ᵉ étape du login quand le user a activé le 2FA. */
    @PostMapping("/login/2fa")
    public TokenResponse login2fa(@Valid @RequestBody Login2faRequest req) {
        return auth.loginWith2fa(req.ticket(), req.code());
    }

    // ============================================================
    // Refresh
    // ============================================================

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return auth.refresh(req.refreshToken());
    }

    // ============================================================
    // 2FA — setup / enable / disable (exigent un access token valide)
    // ============================================================

    @PostMapping("/2fa/setup")
    public TwoFactorSetupResponse setup(Authentication authentication) {
        // Authentication.getName() = userId (cf. AuthenticatedUser)
        return auth.setupTwoFactor(authentication.getName());
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<Void> enable(Authentication authentication,
                                        @Valid @RequestBody TwoFactorCodeRequest req) {
        auth.enableTwoFactor(authentication.getName(), req.code());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<Void> disable(Authentication authentication,
                                         @Valid @RequestBody TwoFactorCodeRequest req) {
        auth.disableTwoFactor(authentication.getName(), req.code());
        return ResponseEntity.noContent().build();
    }
}
