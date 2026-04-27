import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

/**
 * Intercepteur fonctionnel (Angular 15+) :
 *  - injecte Authorization: Bearer <access> sur les requêtes vers notre API
 *  - sur 401, tente un refresh, puis rejoue la requête avec le nouveau token
 *  - gère la réentrance : si plusieurs requêtes partent en même temps et
 *    se prennent un 401, on ne refresh qu'UNE fois et les autres attendent.
 */

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorage);
  const auth = inject(AuthService);

  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
  const token = storage.getAccessToken();
  const reqWithToken = (token && !isAuthEndpoint)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqWithToken).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 sur un endpoint qui n'est pas /auth/* → tenter de refresh
      if (err.status === 401 && !isAuthEndpoint && storage.getRefreshToken()) {
        return handle401(req, next, auth, storage);
      }
      return throwError(() => err);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  _storage: TokenStorage
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshedToken$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap(t => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } })))
    );
  }

  isRefreshing = true;
  refreshedToken$.next(null);

  return auth.refresh().pipe(
    switchMap(resp => {
      isRefreshing = false;
      refreshedToken$.next(resp.accessToken);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${resp.accessToken}` } }));
    }),
    catchError(err => {
      isRefreshing = false;
      refreshedToken$.next(null);
      auth.logout();
      return throwError(() => err);
    })
  );
}
