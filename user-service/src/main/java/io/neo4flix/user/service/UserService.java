package io.neo4flix.user.service;

import io.neo4flix.common.error.ConflictException;
import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.common.error.UnauthorizedException;
import io.neo4flix.user.api.dto.ChangePasswordRequest;
import io.neo4flix.user.api.dto.RegisterUserRequest;
import io.neo4flix.user.api.dto.UpdateUserRequest;
import io.neo4flix.user.api.dto.WatchlistItemDto;
import io.neo4flix.user.domain.User;
import io.neo4flix.user.repository.UserRepository;
import io.neo4flix.user.repository.WatchlistQueries;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;
    private final WatchlistQueries watchlistQueries;
    private final PasswordEncoder passwordEncoder;

    // ----- Lecture -----

    public List<User> findAll() {
        return users.findAll();
    }

    public User findById(String id) {
        return users.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public List<User> search(String username) {
        if (username == null || username.isBlank()) return users.findAll();
        return users.findByUsernameContainingIgnoreCase(username);
    }

    // ----- Écriture -----

    @Transactional
    public User register(RegisterUserRequest req) {
        if (users.existsByUsername(req.username())) {
            throw new ConflictException("username déjà utilisé");
        }
        if (users.existsByEmail(req.email())) {
            throw new ConflictException("email déjà utilisé");
        }
        User u = new User();
        u.setId(UUID.randomUUID().toString());
        u.setUsername(req.username());
        u.setEmail(req.email());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setCreatedAt(Instant.now());
        return users.save(u);
    }

    @Transactional
    public User update(String id, UpdateUserRequest req) {
        User u = findById(id);
        if (req.username() != null && !req.username().equals(u.getUsername())) {
            if (users.existsByUsername(req.username())) {
                throw new ConflictException("username déjà utilisé");
            }
            u.setUsername(req.username());
        }
        if (req.email() != null && !req.email().equals(u.getEmail())) {
            if (users.existsByEmail(req.email())) {
                throw new ConflictException("email déjà utilisé");
            }
            u.setEmail(req.email());
        }
        return users.save(u);
    }

    @Transactional
    public void changePassword(String id, ChangePasswordRequest req) {
        User u = findById(id);
        if (!passwordEncoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw new UnauthorizedException("mot de passe actuel incorrect");
        }
        u.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        users.save(u);
    }

    @Transactional
    public void delete(String id) {
        User u = findById(id);
        users.delete(u);
    }

    // ----- Watchlist -----

    @Transactional
    public void addToWatchlist(String userId, String movieId) {
        // findById pour obtenir un 404 propre si user absent (le MERGE Cypher ne le ferait pas)
        findById(userId);
        long created = users.addToWatchlist(userId, movieId);
        if (created == 0) {
            throw new ResourceNotFoundException("Movie", movieId);
        }
    }

    @Transactional
    public void removeFromWatchlist(String userId, String movieId) {
        findById(userId);
        users.removeFromWatchlist(userId, movieId);
    }

    public List<WatchlistItemDto> getWatchlist(String userId) {
        findById(userId);
        return watchlistQueries.findWatchlist(userId);
    }

    // ----- Follows -----

    @Transactional
    public void follow(String followerId, String followedId) {
        if (followerId.equals(followedId)) {
            throw new ConflictException("Impossible de se suivre soi-même");
        }
        findById(followerId);
        findById(followedId);
        users.follow(followerId, followedId);
    }

    @Transactional
    public void unfollow(String followerId, String followedId) {
        findById(followerId);
        users.unfollow(followerId, followedId);
    }

    public List<User> getFollowing(String userId) {
        findById(userId);
        return users.findFollowing(userId);
    }

    public List<User> getFollowers(String userId) {
        findById(userId);
        return users.findFollowers(userId);
    }
}
