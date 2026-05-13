import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip auth header for public endpoints
  const skipPaths = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/google', '/auth/github'];
  const isPublic = skipPaths.some((p) => req.url.includes(p));

  const token = authService.getAccessToken();
  let authReq = req;

  if (token && !isPublic) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && error.error?.code === 'TOKEN_EXPIRED' && !isPublic) {
        // Try to refresh
        return authService.refreshAccessToken().pipe(
          switchMap((tokens) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
