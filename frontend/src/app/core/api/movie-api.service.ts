import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateMovieRequest, Movie } from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class MovieApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/movies`;

  list(opts: { title?: string; genre?: string } = {}): Observable<Movie[]> {
    let params = new HttpParams();
    if (opts.title) params = params.set('title', opts.title);
    if (opts.genre) params = params.set('genre', opts.genre);
    return this.http.get<Movie[]>(this.base, { params });
  }

  get(id: string): Observable<Movie> {
    return this.http.get<Movie>(`${this.base}/${id}`);
  }

  create(req: CreateMovieRequest): Observable<Movie> {
    return this.http.post<Movie>(this.base, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
