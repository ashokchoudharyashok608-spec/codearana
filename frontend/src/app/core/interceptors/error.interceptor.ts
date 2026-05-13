import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't show toasts for auth refresh failures (handled by auth interceptor)
      if (req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      let message = 'An unexpected error occurred';

      if (error.error?.message) {
        message = error.error.message;
      } else if (error.error?.errors?.length) {
        message = error.error.errors.map((e: any) => e.message).join(', ');
      } else if (error.status === 0) {
        message = 'Cannot connect to server. Check your network.';
      } else if (error.status === 403) {
        message = 'You do not have permission to perform this action';
      } else if (error.status === 404) {
        message = 'Resource not found';
      } else if (error.status === 429) {
        message = error.error?.message || 'Too many requests. Please slow down.';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      }

      // Don't toast for 401 (handled by auth interceptor)
      if (error.status !== 401) {
        snackBar.open(message, 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snack'],
        });
      }

      return throwError(() => error);
    }),
  );
};
