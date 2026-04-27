import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegisterRequest, TokenResponse, User } from '../models/user.model';
import { TokenStorage } from './token-storage';

/**
 * État d'authentification global, exposé sous forme de signal.
 * Les composants peuvent juste injecter AuthService et lire `currentUser()`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(TokenStorage);
  private router = inject(Router);

  // signal interne, mis à jour à chaque login/logout
  private _user = signal<User | null>(this.storage.getUser());

  /** Signal lecture seule pour les composants */
  readonly currentUser = computed(() => this._user());
  readonly isAuthenticated = computed(() => this._user() !== null);

  login(req: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/auth/login`, req)
      .pipe(tap(t => this.persist(t)));
  }

  register(req: RegisterRequest): Observable<User> {
    // Le backend renvoie 201 + UserDto sur POST /users.
    // Le user n'est pas connecté : il faudra ensuite POST /auth/login.
    return this.http.post<User>(`${environment.apiBaseUrl}/users`, req);
  }

  /** Refresh appelé par l'interceptor sur 401. */
  refresh(): Observable<TokenResponse> {
    const refreshToken = this.storage.getRefreshToken();
    return this.http.post<TokenResponse>(
      `${environment.apiBaseUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(tap(t => this.persist(t)));
  }

  logout(): void {
    this.storage.clear();
    this._user.set(null);
    this.router.navigateByUrl('/login');
  }

  private persist(t: TokenResponse): void {
    this.storage.save(t);
    this._user.set(t.user);
  }
}
