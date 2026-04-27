// Aligné sur io.neo4flix.rating.api.dto.{RatingDto, MovieRatingStats}
export interface Rating {
  userId: string;
  username: string;
  movieId: string;
  movieTitle: string;
  score: number;
  ratedAt: string;
}

export interface MovieRatingStats {
  movieId: string;
  count: number;
  average: number;
}
