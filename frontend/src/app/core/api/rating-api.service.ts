import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovieRatingStats, Rating } from '../models/rating.model';

@Injectable({ providedIn: 'root' })
export class RatingApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/ratings`;

  rate(userId: string, movieId: string, score: number): Observable<Rating> {
    return this.http.put<Rating>(
      `${this.base}/users/${userId}/movies/${movieId}`,
      { score }
    );
  }

  byUser(userId: string): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.base}/users/${userId}`);
  }

  byMovie(movieId: string): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.base}/movies/${movieId}`);
  }

  stats(movieId: string): Observable<MovieRatingStats> {
    return this.http.get<MovieRatingStats>(`${this.base}/movies/${movieId}/stats`);
  }

  delete(userId: string, movieId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${userId}/movies/${movieId}`);
  }
}
