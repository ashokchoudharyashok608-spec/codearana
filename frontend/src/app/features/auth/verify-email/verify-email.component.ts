import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (loading()) {
          <div class="center"><mat-spinner /><p>Verifying your email...</p></div>
        } @else if (success()) {
          <div class="success-box">
            <mat-icon>verified</mat-icon>
            <h2>Email verified!</h2>
            <p>Your account is now fully activated. Start solving problems!</p>
            <a mat-raised-button color="primary" routerLink="/problems">Go to Problems</a>
          </div>
        } @else {
          <div class="error-box">
            <mat-icon>cancel</mat-icon>
            <h2>Verification failed</h2>
            <p>The link may be expired or invalid. Request a new one from your profile.</p>
            <a mat-stroked-button routerLink="/">Go Home</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height:calc(100vh - 64px); display:flex; align-items:center; justify-content:center; padding:40px 16px; }
    .auth-card { width:100%; max-width:420px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:48px 40px; }
    .center { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; color:var(--text-secondary); }
    .success-box, .error-box { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
    .success-box mat-icon { font-size:56px; width:56px; height:56px; color:#3fb950; }
    .error-box mat-icon { font-size:56px; width:56px; height:56px; color:#f85149; }
    h2 { margin:0; font-size:22px; font-weight:700; }
    p { color:var(--text-secondary); margin:0; font-size:14px; line-height:1.6; }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  loading = signal(true);
  success = signal(false);

  ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) { this.loading.set(false); return; }

    this.http.get(`${environment.apiUrl}/auth/verify-email?token=${token}`).subscribe({
      next: () => { this.success.set(true); this.loading.set(false); },
      error: () => { this.success.set(false); this.loading.set(false); },
    });
  }
}
