import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResult,
  RegisterRequest,
  TokenResponse,
  TwoFactorSetupResponse,
  User
} from '../models/user.model';
import { TokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(TokenStorage);
  private router = inject(Router);

  private _user = signal<User | null>(this.storage.getUser());

  readonly currentUser = computed(() => this._user());
  readonly isAuthenticated = computed(() => this._user() !== null);

  /**
   * Login. Le backend peut renvoyer soit tokens (LoginResult.requires2fa=false),
   * soit un challenge 2FA (requires2fa=true). On persiste les tokens UNIQUEMENT
   * dans le 1er cas.
   */
  login(req: LoginRequest): Observable<LoginResult> {
    return this.http.post<LoginResult>(`${environment.apiBaseUrl}/auth/login`, req)
      .pipe(tap(res => {
        if (!res.requires2fa && res.accessToken && res.user) {
          this.persist({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken!,
            tokenType: 'Bearer',
            expiresInSeconds: res.expiresInSeconds!,
            user: res.user
          });
        }
      }));
  }

  /** 2ᵉ étape de login quand requires2fa=true. */
  login2fa(ticket: string, code: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(
      `${environment.apiBaseUrl}/auth/login/2fa`,
      { ticket, code }
    ).pipe(tap(t => this.persist(t)));
  }

  register(req: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${environment.apiBaseUrl}/users`, req);
  }

  refresh(): Observable<TokenResponse> {
    const refreshToken = this.storage.getRefreshToken();
    return this.http.post<TokenResponse>(
      `${environment.apiBaseUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(tap(t => this.persist(t)));
  }

  // ----- 2FA -----

  setup2fa(): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(
      `${environment.apiBaseUrl}/auth/2fa/setup`,
      {}
    );
  }

  enable2fa(code: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiBaseUrl}/auth/2fa/enable`,
      { code }
    ).pipe(tap(() => {
      const u = this._user();
      if (u) this._user.set({ ...u, twoFactorEnabled: true });
    }));
  }

  disable2fa(code: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiBaseUrl}/auth/2fa/disable`,
      { code }
    ).pipe(tap(() => {
      const u = this._user();
      if (u) this._user.set({ ...u, twoFactorEnabled: false });
    }));
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
