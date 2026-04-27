package io.neo4flix.movie.api;

import io.neo4flix.movie.api.dto.MovieDto;
import io.neo4flix.movie.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService service;

    /** GET /movies?title=...&genre=... */
    @GetMapping
    public List<MovieDto> list(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String genre
    ) {
        if (genre != null && !genre.isBlank()) {
            return service.findByGenre(genre).stream().map(MovieDto::from).toList();
        }
        return service.search(title).stream().map(MovieDto::from).toList();
    }

    /** GET /movies/{id} */
    @GetMapping("/{id}")
    public MovieDto getOne(@PathVariable String id) {
        return MovieDto.from(service.findById(id));
    }
}
