import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const isAuthFreeEndpoint = (url: string): boolean => {
  return (
    url.includes('/api/user/login') ||
    url.includes('/api/user/register') ||
    url.includes('/api/user/refresh') ||
    url.includes('/api/user/logout')
  );
};

let refreshInFlight$: Observable<boolean> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const accessToken = authService.getAccessToken();
  const reqWithToken = !isAuthFreeEndpoint(req.url) && accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(reqWithToken).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }
      if (err.status !== 401) {
        return throwError(() => err);
      }
      if (isAuthFreeEndpoint(req.url)) {
        return throwError(() => err);
      }

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        authService.logoutLocal();
        return throwError(() => err);
      }

      const refresh$ = refreshInFlight$ ?? (refreshInFlight$ = authService.refresh().pipe(
        shareReplay(1),
        finalize(() => {
          refreshInFlight$ = null;
        })
      ));

      return refresh$.pipe(
        switchMap((ok) => {
          if (!ok) {
            authService.logoutLocal();
            return throwError(() => err);
          }

          const newAccessToken = authService.getAccessToken();
          if (!newAccessToken) {
            authService.logoutLocal();
            return throwError(() => err);
          }

          const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newAccessToken}` } });
          return next(retryReq);
        })
      );
    })
  );
};
