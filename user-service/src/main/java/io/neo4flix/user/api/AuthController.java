package io.neo4flix.user.api;

import io.neo4flix.user.api.dto.LoginRequest;
import io.neo4flix.user.api.dto.RefreshTokenRequest;
import io.neo4flix.user.api.dto.TokenResponse;
import io.neo4flix.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService auth;

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return auth.refresh(req.refreshToken());
    }
}
