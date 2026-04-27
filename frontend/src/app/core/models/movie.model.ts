// Aligné sur io.neo4flix.movie.api.dto.MovieDto
export interface Movie {
  id: string;
  title: string;
  releaseYear: number | null;
  duration: number | null;
  description: string | null;
  posterUrl: string | null;
  genres: string[];
  directors: string[];
}

export interface CreateMovieRequest {
  title: string;
  releaseYear: number;
  duration?: number;
  description?: string;
  posterUrl?: string;
  genres?: string[];
  directorIds?: string[];
}
