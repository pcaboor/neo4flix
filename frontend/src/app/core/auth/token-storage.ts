import { Injectable } from '@angular/core';
import { TokenResponse } from '../models/user.model';

const KEY_ACCESS = 'neo4flix.access';
const KEY_REFRESH = 'neo4flix.refresh';
const KEY_USER = 'neo4flix.user';

/**
 * Wrapper autour de localStorage. On l'isole pour pouvoir le mocker
 * dans les tests, et pour pouvoir basculer plus tard sur sessionStorage
 * ou un cookie HttpOnly sans toucher le reste du code.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  save(t: TokenResponse): void {
    localStorage.setItem(KEY_ACCESS, t.accessToken);
    localStorage.setItem(KEY_REFRESH, t.refreshToken);
    localStorage.setItem(KEY_USER, JSON.stringify(t.user));
  }

  setAccessToken(token: string): void {
    localStorage.setItem(KEY_ACCESS, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(KEY_ACCESS);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(KEY_REFRESH);
  }

  getUser() {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  }

  clear(): void {
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_USER);
  }
}
