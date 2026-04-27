// Aligné sur io.neo4flix.common.error.ApiError
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details: string[];
}
