package io.neo4flix.rating.api;

import io.neo4flix.rating.api.dto.MovieRatingStats;
import io.neo4flix.rating.api.dto.RateMovieRequest;
import io.neo4flix.rating.api.dto.RatingDto;
import io.neo4flix.rating.service.RatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService service;

    /** PUT idempotent — équivalent "noter ou renoter". */
    @PutMapping("/users/{userId}/movies/{movieId}")
    public RatingDto rate(@PathVariable String userId,
                          @PathVariable String movieId,
                          @Valid @RequestBody RateMovieRequest req) {
        return service.rate(userId, movieId, req.score());
    }

    @GetMapping("/users/{userId}/movies/{movieId}")
    public RatingDto getOne(@PathVariable String userId, @PathVariable String movieId) {
        return service.findOne(userId, movieId);
    }

    @GetMapping("/users/{userId}")
    public List<RatingDto> byUser(@PathVariable String userId) {
        return service.findByUser(userId);
    }

    @GetMapping("/movies/{movieId}")
    public List<RatingDto> byMovie(@PathVariable String movieId) {
        return service.findByMovie(movieId);
    }

    @GetMapping("/movies/{movieId}/stats")
    public MovieRatingStats stats(@PathVariable String movieId) {
        return service.stats(movieId);
    }

    @DeleteMapping("/users/{userId}/movies/{movieId}")
    public ResponseEntity<Void> delete(@PathVariable String userId, @PathVariable String movieId) {
        service.delete(userId, movieId);
        return ResponseEntity.noContent().build();
    }
}
