import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { WatchlistItem } from '../models/watchlist.model';

export interface UpdateUserRequest {
  username?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class UserApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/users`;

  list(usernameSearch?: string): Observable<User[]> {
    const params = usernameSearch
      ? new HttpParams().set('username', usernameSearch)
      : new HttpParams();
    return this.http.get<User[]>(this.base, { params });
  }

  get(id: string): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  update(id: string, req: UpdateUserRequest): Observable<User> {
    return this.http.patch<User>(`${this.base}/${id}`, req);
  }

  changePassword(id: string, currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/password`,
      { currentPassword, newPassword });
  }

  // ----- Watchlist -----

  watchlist(userId: string): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(`${this.base}/${userId}/watchlist`);
  }

  addToWatchlist(userId: string, movieId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${userId}/watchlist/${movieId}`, {});
  }

  removeFromWatchlist(userId: string, movieId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}/watchlist/${movieId}`);
  }

  // ----- Follows -----

  following(userId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/${userId}/following`);
  }

  followers(userId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/${userId}/followers`);
  }

  follow(userId: string, otherId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${userId}/following/${otherId}`, {});
  }

  unfollow(userId: string, otherId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}/following/${otherId}`);
  }
}
