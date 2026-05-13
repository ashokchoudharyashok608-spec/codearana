import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="not-found">
      <div class="glitch" data-text="404">404</div>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div class="actions">
        <a mat-raised-button color="primary" routerLink="/">
          <mat-icon>home</mat-icon> Go Home
        </a>
        <a mat-stroked-button routerLink="/problems">
          <mat-icon>code</mat-icon> Browse Problems
        </a>
      </div>
    </div>
  `,
  styles: [`
    .not-found {
      min-height: calc(100vh - 64px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 24px;
      gap: 16px;
    }
    .glitch {
      font-size: 120px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent-primary);
      opacity: .15;
      line-height: 1;
      margin-bottom: 8px;
    }
    h1 { font-size: 28px; font-weight: 700; margin: 0; }
    p { color: var(--text-secondary); margin: 0; font-size: 16px; }
    .actions { display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }
  `],
})
export class NotFoundComponent {}
