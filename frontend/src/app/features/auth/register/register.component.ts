import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <a routerLink="/" class="auth-brand">⚔ CodeArena</a>
          <h1>Create your account</h1>
          <p>Join thousands of competitive programmers</p>
        </div>

        <div class="oauth-btns">
          <button mat-stroked-button class="oauth-btn" (click)="auth.loginWithGoogle()">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign up with Google
          </button>
          <button mat-stroked-button class="oauth-btn" (click)="auth.loginWithGitHub()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            Sign up with GitHub
          </button>
        </div>

        <div class="divider-row">
          <mat-divider></mat-divider><span>or</span><mat-divider></mat-divider>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <mat-form-field>
            <mat-label>Display Name</mat-label>
            <input matInput formControlName="displayName" autocomplete="name">
          </mat-form-field>

          <mat-form-field>
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" autocomplete="username">
            <mat-hint>3–20 characters, letters/numbers/underscores only</mat-hint>
            @if (form.get('username')?.errors?.['required'] && form.get('username')?.touched) {
              <mat-error>Username is required</mat-error>
            }
            @if (form.get('username')?.errors?.['pattern'] && form.get('username')?.touched) {
              <mat-error>Only letters, numbers, and underscores</mat-error>
            }
            @if (form.get('username')?.errors?.['minlength'] && form.get('username')?.touched) {
              <mat-error>At least 3 characters</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Email address</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email">
            @if (form.get('email')?.errors?.['required'] && form.get('email')?.touched) {
              <mat-error>Email is required</mat-error>
            }
            @if (form.get('email')?.errors?.['email'] && form.get('email')?.touched) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Password</mat-label>
            <input matInput [type]="showPass() ? 'text' : 'password'" formControlName="password" autocomplete="new-password">
            <button mat-icon-button matSuffix type="button" (click)="showPass.set(!showPass())">
              <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>Minimum 8 characters</mat-hint>
            @if (form.get('password')?.errors?.['required'] && form.get('password')?.touched) {
              <mat-error>Password is required</mat-error>
            }
            @if (form.get('password')?.errors?.['minlength'] && form.get('password')?.touched) {
              <mat-error>At least 8 characters required</mat-error>
            }
          </mat-form-field>

          @if (error()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon> {{ error() }}
            </div>
          }

          <button mat-raised-button color="primary" type="submit" class="submit-btn" [disabled]="loading()">
            @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
            @else { Create Account — Free }
          </button>

          <p class="terms">
            By registering, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </form>

        <p class="auth-switch">
          Already have an account? <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 24px; }
    .auth-card { width: 100%; max-width: 440px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 40px; }
    .auth-header { text-align: center; margin-bottom: 32px; }
    .auth-brand { font-size: 20px; font-weight: 700; font-family: monospace; color: var(--accent-primary); text-decoration: none; display: block; margin-bottom: 24px; }
    .auth-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    .auth-header p { color: var(--text-secondary); margin: 0; font-size: 14px; }
    .oauth-btns { display: flex; flex-direction: column; gap: 12px; }
    .oauth-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px !important; font-size: 14px !important; border-color: var(--border-color) !important; }
    .divider-row { display: flex; align-items: center; gap: 16px; margin: 24px 0; color: var(--text-secondary); font-size: 13px; }
    .divider-row mat-divider { flex: 1; }
    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .auth-form mat-form-field { width: 100%; }
    .error-banner { display: flex; align-items: center; gap: 8px; background: rgba(248,81,73,.1); border: 1px solid rgba(248,81,73,.3); color: #f85149; padding: 12px 16px; border-radius: 8px; font-size: 14px; }
    .submit-btn { width: 100%; padding: 12px !important; font-size: 15px !important; margin-top: 8px; }
    .terms { font-size: 12px; color: var(--text-secondary); text-align: center; margin: 8px 0 0; }
    .terms a { color: var(--accent-primary); text-decoration: none; }
    .auth-switch { text-align: center; margin-top: 24px; font-size: 14px; color: var(--text-secondary); }
    .auth-switch a { color: var(--accent-primary); text-decoration: none; font-weight: 500; }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  form = this.fb.nonNullable.group({
    displayName: [''],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.snack.open('Account created! Check your email to verify.', 'OK', { duration: 6000 });
        this.router.navigate(['/problems']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Registration failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
