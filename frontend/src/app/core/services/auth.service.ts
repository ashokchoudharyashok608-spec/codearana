import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'SETTER' | 'ADMIN';
  rating: number;
  totalSolved: number;
  subscription?: { plan: string; status: string };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  // ── Signals ────────────────────────────────────────────────────────────────
  private _user = signal<User | null>(null);
  private _loading = signal(false);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly isSetter = computed(() => ['ADMIN', 'SETTER'].includes(this._user()?.role || ''));

  initAuth() {
    const token = this.getAccessToken();
    if (token) {
      this.fetchCurrentUser().subscribe();
    }
  }

  register(data: { email: string; username: string; password: string; displayName?: string }): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((res) => this.storeTokens(res)),
    );
  }

  login(email: string, password: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => this.storeTokens(res)),
    );
  }

  logout() {
    const refreshToken = this.getRefreshToken();
    this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }).subscribe();
    this.clearTokens();
    this._user.set(null);
    this.router.navigate(['/']);
  }

  refreshAccessToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<{ accessToken: string; refreshToken: string }>(
      `${this.apiUrl}/auth/refresh`,
      { refreshToken },
    ).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.accessToken);
        localStorage.setItem('refresh_token', res.refreshToken);
      }),
      catchError((err) => {
        this.clearTokens();
        this._user.set(null);
        return throwError(() => err);
      }),
    );
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => this._user.set(user)),
      catchError((err) => {
        if (err.status === 401) {
          this.clearTokens();
          this._user.set(null);
        }
        return throwError(() => err);
      }),
    );
  }

  handleOAuthCallback(accessToken: string, refreshToken: string): Observable<User> {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    return this.fetchCurrentUser();
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private storeTokens(res: AuthTokens) {
    localStorage.setItem('access_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    this._user.set(res.user);
  }

  private clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // OAuth login URLs
  loginWithGoogle() {
    window.location.href = `${this.apiUrl}/auth/google`;
  }

  loginWithGitHub() {
    window.location.href = `${this.apiUrl}/auth/github`;
  }
}
