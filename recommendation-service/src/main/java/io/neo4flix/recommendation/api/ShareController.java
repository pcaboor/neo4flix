package io.neo4flix.recommendation.api;

import io.neo4flix.recommendation.api.dto.CreateShareRequest;
import io.neo4flix.recommendation.api.dto.CreatedShareDto;
import io.neo4flix.recommendation.api.dto.ShareDto;
import io.neo4flix.recommendation.service.ShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/shares")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService service;

    /**
     * POST /shares — authentifié.
     * userId vient du JWT (Authentication.getName()).
     */
    @PostMapping
    public ResponseEntity<CreatedShareDto> create(Authentication auth,
                                                   @Valid @RequestBody CreateShareRequest req) {
        return ResponseEntity.status(201).body(service.createShare(auth.getName(), req.strategy()));
    }

    /**
     * GET /shares/{token} — public (whitelist dans SecurityConfig).
     */
    @GetMapping("/{token}")
    public ShareDto get(@PathVariable String token) {
        return service.getShare(token);
    }
}
