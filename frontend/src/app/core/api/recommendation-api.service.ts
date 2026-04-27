import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recommendation } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/recommendations`;

  byGenre(userId: string, limit = 10): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(
      `${this.base}/users/${userId}/by-genre`,
      { params: new HttpParams().set('limit', limit) }
    );
  }

  collaborative(userId: string, limit = 10): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(
      `${this.base}/users/${userId}/collaborative`,
      { params: new HttpParams().set('limit', limit) }
    );
  }

  fromFollowing(userId: string, limit = 10): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(
      `${this.base}/users/${userId}/from-following`,
      { params: new HttpParams().set('limit', limit) }
    );
  }

  similarTo(movieId: string, limit = 10): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(
      `${this.base}/movies/${movieId}/similar`,
      { params: new HttpParams().set('limit', limit) }
    );
  }
}
