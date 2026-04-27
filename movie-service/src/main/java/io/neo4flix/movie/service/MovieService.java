package io.neo4flix.movie.service;

import io.neo4flix.common.error.ResourceNotFoundException;
import io.neo4flix.movie.api.dto.CreateMovieRequest;
import io.neo4flix.movie.api.dto.PatchMovieRequest;
import io.neo4flix.movie.api.dto.UpdateMovieRequest;
import io.neo4flix.movie.domain.Director;
import io.neo4flix.movie.domain.Genre;
import io.neo4flix.movie.domain.Movie;
import io.neo4flix.movie.repository.DirectorRepository;
import io.neo4flix.movie.repository.GenreRepository;
import io.neo4flix.movie.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository movies;
    private final GenreRepository genres;
    private final DirectorRepository directors;

    // ----- Lecture -----

    public List<Movie> findAll() {
        return movies.findAll();
    }

    public Movie findById(String id) {
        return movies.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie", id));
    }

    public List<Movie> search(String title) {
        if (title == null || title.isBlank()) return movies.findAll();
        return movies.findByTitleContainingIgnoreCase(title);
    }

    public List<Movie> findByGenre(String genre) {
        return movies.findByGenre(genre);
    }

    // ----- Écriture -----

    /**
     * Création d'un film.
     * - genres : créés à la volée s'ils n'existent pas
     * - directors : doivent exister (404 sinon)
     * - id : UUID généré
     */
    @Transactional
    public Movie create(CreateMovieRequest req) {
        Movie m = new Movie();
        m.setId(UUID.randomUUID().toString());
        applyFields(m, req.title(), req.releaseYear(), req.duration(),
                req.description(), req.posterUrl());
        m.setGenres(resolveGenres(req.genres()));
        m.setDirectors(resolveDirectors(req.directorIds()));
        return movies.save(m);
    }

    /** Remplacement complet (PUT) : on détache les anciennes relations avant de re-saver. */
    @Transactional
    public Movie replace(String id, UpdateMovieRequest req) {
        Movie m = findById(id);
        movies.detachGenres(id);
        movies.detachDirectors(id);
        applyFields(m, req.title(), req.releaseYear(), req.duration(),
                req.description(), req.posterUrl());
        m.setGenres(resolveGenres(req.genres()));
        m.setDirectors(resolveDirectors(req.directorIds()));
        return movies.save(m);
    }

    /** Maj partielle (PATCH) : null = "ne pas modifier". */
    @Transactional
    public Movie patch(String id, PatchMovieRequest req) {
        Movie m = findById(id);
        if (req.title() != null)        m.setTitle(req.title());
        if (req.releaseYear() != null)  m.setReleaseYear(req.releaseYear());
        if (req.duration() != null)     m.setDuration(req.duration());
        if (req.description() != null)  m.setDescription(req.description());
        if (req.posterUrl() != null)    m.setPosterUrl(req.posterUrl());

        if (req.genres() != null) {
            movies.detachGenres(id);
            m.setGenres(resolveGenres(req.genres()));
        }
        if (req.directorIds() != null) {
            movies.detachDirectors(id);
            m.setDirectors(resolveDirectors(req.directorIds()));
        }
        return movies.save(m);
    }

    @Transactional
    public void delete(String id) {
        Movie m = findById(id);
        movies.delete(m);
    }

    // ----- Helpers -----

    private void applyFields(Movie m, String title, Integer releaseYear, Integer duration,
                             String description, String posterUrl) {
        m.setTitle(title);
        m.setReleaseYear(releaseYear);
        m.setDuration(duration);
        m.setDescription(description);
        m.setPosterUrl(posterUrl);
    }

    /** Crée les genres absents, retourne le Set complet. */
    private Set<Genre> resolveGenres(List<String> names) {
        if (names == null || names.isEmpty()) return new HashSet<>();
        Set<Genre> result = new HashSet<>();
        for (String name : names) {
            Genre g = genres.findById(name).orElseGet(() -> genres.save(new Genre(name)));
            result.add(g);
        }
        return result;
    }

    /** Récupère les directors existants ; 404 si l'un manque. */
    private Set<Director> resolveDirectors(List<String> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        Set<Director> result = new HashSet<>();
        for (String id : ids) {
            Director d = directors.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Director", id));
            result.add(d);
        }
        return result;
    }
}