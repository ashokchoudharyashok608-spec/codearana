import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">🔑</div>
          <h1>Forgot password?</h1>
          <p class="auth-subtitle">Enter your email and we'll send you a reset link.</p>
        </div>

        @if (sent()) {
          <div class="success-box">
            <mat-icon>mark_email_read</mat-icon>
            <p>If that email exists, a reset link is on its way. Check your inbox (and spam).</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            @if (error()) {
              <div class="error-banner"><mat-icon>error</mat-icon> {{ error() }}</div>
            }
            <mat-form-field>
              <mat-label>Email address</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" class="submit-btn" [disabled]="loading()">
              @if (loading()) { <mat-spinner diameter="20" /> } @else { Send Reset Link }
            </button>
          </form>
        }

        <p class="auth-switch">
          Remember your password? <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height:calc(100vh - 64px); display:flex; align-items:center; justify-content:center; padding:40px 16px; }
    .auth-card { width:100%; max-width:420px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:40px; }
    .auth-header { text-align:center; margin-bottom:32px; }
    .auth-logo { font-size:40px; margin-bottom:12px; }
    .auth-header h1 { font-size:24px; font-weight:700; margin:0 0 8px; }
    .auth-subtitle { color:var(--text-secondary); margin:0; font-size:14px; }
    .auth-form { display:flex; flex-direction:column; gap:8px; }
    .auth-form mat-form-field { width:100%; }
    .submit-btn { width:100%; height:44px; font-size:15px; margin-top:8px; }
    .auth-switch { text-align:center; font-size:14px; color:var(--text-secondary); margin:24px 0 0; }
    .auth-switch a { color:var(--accent-primary); text-decoration:none; }
    .error-banner { display:flex; align-items:center; gap:8px; background:rgba(248,81,73,.1); border:1px solid rgba(248,81,73,.3); color:#f85149; padding:12px 16px; border-radius:8px; font-size:14px; }
    .success-box { display:flex; flex-direction:column; align-items:center; gap:12px; padding:24px; background:rgba(63,185,80,.1); border:1px solid rgba(63,185,80,.3); border-radius:12px; color:#3fb950; text-align:center; }
    .success-box mat-icon { font-size:40px; width:40px; height:40px; }
    .success-box p { margin:0; color:var(--text-primary); font-size:14px; }
  `],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  sent = signal(false);
  error = signal('');

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, this.form.value).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: () => { this.error.set('Something went wrong. Please try again.'); this.loading.set(false); },
    });
  }
}
