// Aligné sur io.neo4flix.user.api.dto.WatchlistItemDto
export interface WatchlistItem {
  id: string;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  addedAt: string;
}
