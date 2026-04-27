// Aligné sur io.neo4flix.recommendation.api.dto.RecommendationDto
export interface Recommendation {
  movieId: string;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  genres: string[];
  score: number;
  reason: string | null;
}
