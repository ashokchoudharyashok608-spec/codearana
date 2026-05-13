import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;height:calc(100vh - 64px);flex-direction:column;gap:16px">
      <mat-spinner diameter="48"></mat-spinner>
      <p style="color:var(--text-secondary)">Completing sign in...</p>
    </div>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit() {
    const access = this.route.snapshot.queryParams['access'];
    const refresh = this.route.snapshot.queryParams['refresh'];

    if (!access || !refresh) {
      this.router.navigate(['/auth/login'], { queryParams: { error: 'oauth_failed' } });
      return;
    }

    this.auth.handleOAuthCallback(access, refresh).subscribe({
      next: () => this.router.navigate(['/problems']),
      error: () => this.router.navigate(['/auth/login'], { queryParams: { error: 'oauth_failed' } }),
    });
  }
}
