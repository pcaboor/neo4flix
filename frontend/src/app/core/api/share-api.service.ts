import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recommendation } from '../models/recommendation.model';

export type ShareStrategy = 'by-genre' | 'collaborative' | 'from-following';

export interface CreatedShare {
  token: string;
  url: string;
}

export interface SharedRecommendations {
  token: string;
  ownerUsername: string;
  strategy: ShareStrategy;
  items: Recommendation[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ShareApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/shares`;

  create(strategy: ShareStrategy): Observable<CreatedShare> {
    return this.http.post<CreatedShare>(this.base, { strategy });
  }

  /** Public — pas de token JWT requis. */
  get(token: string): Observable<SharedRecommendations> {
    return this.http.get<SharedRecommendations>(`${this.base}/${token}`);
  }
}
