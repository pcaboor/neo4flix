package io.neo4flix.user.api;

import io.neo4flix.user.api.dto.ChangePasswordRequest;
import io.neo4flix.user.api.dto.RegisterUserRequest;
import io.neo4flix.user.api.dto.UpdateUserRequest;
import io.neo4flix.user.api.dto.UserDto;
import io.neo4flix.user.api.dto.WatchlistItemDto;
import io.neo4flix.user.domain.User;
import io.neo4flix.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    // ============================================================
    // CRUD utilisateur
    // ============================================================

    @GetMapping
    public List<UserDto> list(@RequestParam(required = false) String username) {
        return service.search(username).stream().map(UserDto::from).toList();
    }

    @GetMapping("/{id}")
    public UserDto getOne(@PathVariable String id) {
        return UserDto.from(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterUserRequest req) {
        User created = service.register(req);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(UserDto.from(created));
    }

    @PatchMapping("/{id}")
    public UserDto update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest req) {
        return UserDto.from(service.update(id, req));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Void> changePassword(@PathVariable String id,
                                                @Valid @RequestBody ChangePasswordRequest req) {
        service.changePassword(id, req);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // Watchlist
    // ============================================================

    @GetMapping("/{id}/watchlist")
    public List<WatchlistItemDto> getWatchlist(@PathVariable String id) {
        return service.getWatchlist(id);
    }

    @PutMapping("/{id}/watchlist/{movieId}")
    public ResponseEntity<Void> addToWatchlist(@PathVariable String id, @PathVariable String movieId) {
        service.addToWatchlist(id, movieId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/watchlist/{movieId}")
    public ResponseEntity<Void> removeFromWatchlist(@PathVariable String id, @PathVariable String movieId) {
        service.removeFromWatchlist(id, movieId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // Follows
    // ============================================================

    @GetMapping("/{id}/following")
    public List<UserDto> getFollowing(@PathVariable String id) {
        return service.getFollowing(id).stream().map(UserDto::from).toList();
    }

    @GetMapping("/{id}/followers")
    public List<UserDto> getFollowers(@PathVariable String id) {
        return service.getFollowers(id).stream().map(UserDto::from).toList();
    }

    @PutMapping("/{id}/following/{otherId}")
    public ResponseEntity<Void> follow(@PathVariable String id, @PathVariable String otherId) {
        service.follow(id, otherId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/following/{otherId}")
    public ResponseEntity<Void> unfollow(@PathVariable String id, @PathVariable String otherId) {
        service.unfollow(id, otherId);
        return ResponseEntity.noContent().build();
    }
}
