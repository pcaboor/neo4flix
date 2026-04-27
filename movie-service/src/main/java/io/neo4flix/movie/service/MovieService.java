package io.neo4flix.movie.service;

import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.movie.domain.Movie;
import io.neo4flix.movie.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @RequiredArgsConstructor génère un constructeur avec tous les champs `final`
 * → injection par constructeur sans écrire le boilerplate.
 */
@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository repository;

    public List<Movie> findAll() {
        return repository.findAll();
    }

    public Movie findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie", id));
    }

    public List<Movie> search(String title) {
        if (title == null || title.isBlank()) return repository.findAll();
        return repository.findByTitleContainingIgnoreCase(title);
    }

    public List<Movie> findByGenre(String genre) {
        return repository.findByGenre(genre);
    }
}
