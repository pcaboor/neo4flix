package io.neo4flix.recommendation.api;

import io.neo4flix.recommendation.api.dto.RecommendationDto;
import io.neo4flix.recommendation.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService service;

    /**
     * GET /recommendations/users/{userId}/by-genre
     * Recommandations basées sur les genres préférés du user.
     */
    @GetMapping("/users/{userId}/by-genre")
    public List<RecommendationDto> byGenre(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") int limit) {
        return service.byGenre(userId, limit);
    }

    /**
     * GET /recommendations/users/{userId}/collaborative
     * "Les gens qui notent comme toi aiment aussi..."
     */
    @GetMapping("/users/{userId}/collaborative")
    public List<RecommendationDto> collaborative(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") int limit) {
        return service.collaborative(userId, limit);
    }

    /**
     * GET /recommendations/users/{userId}/from-following
     * Films aimés par les comptes que je suis.
     */
    @GetMapping("/users/{userId}/from-following")
    public List<RecommendationDto> fromFollowing(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") int limit) {
        return service.fromFollowing(userId, limit);
    }

    /**
     * GET /recommendations/movies/{movieId}/similar
     * Films similaires à un film donné (utile sur la fiche film).
     */
    @GetMapping("/movies/{movieId}/similar")
    public List<RecommendationDto> similar(
            @PathVariable String movieId,
            @RequestParam(defaultValue = "10") int limit) {
        return service.similarTo(movieId, limit);
    }
}
