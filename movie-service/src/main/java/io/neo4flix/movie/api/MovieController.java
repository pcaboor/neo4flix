package io.neo4flix.movie.api;

import io.neo4flix.movie.api.dto.CreateMovieRequest;
import io.neo4flix.movie.api.dto.MovieDto;
import io.neo4flix.movie.api.dto.PatchMovieRequest;
import io.neo4flix.movie.api.dto.UpdateMovieRequest;
import io.neo4flix.movie.domain.Movie;
import io.neo4flix.movie.service.MovieService;
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
@RequestMapping("/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService service;

    /** GET /movies?title=&genre=&yearFrom=&yearTo= — tous les filtres optionnels et combinables */
    @GetMapping
    public List<MovieDto> list(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo
    ) {
        return service.search(title, genre, yearFrom, yearTo).stream()
                .map(MovieDto::from)
                .toList();
    }

    /** GET /movies/{id} */
    @GetMapping("/{id}")
    public MovieDto getOne(@PathVariable String id) {
        return MovieDto.from(service.findById(id));
    }

    /** POST /movies → 201 Created + Location header */
    @PostMapping
    public ResponseEntity<MovieDto> create(@Valid @RequestBody CreateMovieRequest req) {
        Movie created = service.create(req);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(MovieDto.from(created));
    }

    /** PUT /movies/{id} → remplacement complet */
    @PutMapping("/{id}")
    public MovieDto replace(@PathVariable String id, @Valid @RequestBody UpdateMovieRequest req) {
        return MovieDto.from(service.replace(id, req));
    }

    /** PATCH /movies/{id} → maj partielle */
    @PatchMapping("/{id}")
    public MovieDto patch(@PathVariable String id, @Valid @RequestBody PatchMovieRequest req) {
        return MovieDto.from(service.patch(id, req));
    }

    /** DELETE /movies/{id} → 204 No Content */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}