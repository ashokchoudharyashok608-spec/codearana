import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatMenuModule, MatIconModule, MatDividerModule,
  ],
  template: `
    <mat-toolbar class="navbar">
      <div class="navbar-brand">
        <a routerLink="/" class="brand-link">
          <span class="brand-icon">⚔</span>
          <span class="brand-name">CodeArena</span>
        </a>
      </div>

      <nav class="navbar-nav">
        <a mat-button routerLink="/problems" routerLinkActive="active-link">Problems</a>
        <a mat-button routerLink="/contests" routerLinkActive="active-link">Contests</a>
        <a mat-button routerLink="/leaderboard" routerLinkActive="active-link">Leaderboard</a>
        <a mat-button routerLink="/pricing" routerLinkActive="active-link">Pricing</a>
      </nav>

      <div class="navbar-actions">
        <button mat-icon-button (click)="themeService.toggle()" [title]="'Switch to ' + (themeService.theme() === 'dark' ? 'light' : 'dark') + ' mode'">
          <mat-icon>{{ themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>

        @if (auth.isAuthenticated()) {
          @if (auth.isAdmin()) {
            <a mat-button routerLink="/admin" routerLinkActive="active-link">
              <mat-icon>admin_panel_settings</mat-icon> Admin
            </a>
          }
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-trigger">
            @if (auth.user()?.avatarUrl) {
              <img [src]="auth.user()!.avatarUrl" class="avatar" [alt]="auth.user()!.displayName">
            } @else {
              <mat-icon>account_circle</mat-icon>
            }
            <span class="username">{{ auth.user()?.username }}</span>
            <mat-icon>arrow_drop_down</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <a mat-menu-item [routerLink]="['/profile', auth.user()?.username]">
              <mat-icon>person</mat-icon> Profile
            </a>
            <a mat-menu-item routerLink="/submissions">
              <mat-icon>code</mat-icon> My Submissions
            </a>
            <mat-divider />
            <button mat-menu-item (click)="auth.logout()" class="logout-btn">
              <mat-icon>logout</mat-icon> Sign Out
            </button>
          </mat-menu>
        } @else {
          <a mat-button routerLink="/auth/login">Sign In</a>
          <a mat-raised-button color="primary" routerLink="/auth/register" class="register-btn">
            Get Started
          </a>
        }
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 0 24px;
      gap: 16px;
      box-shadow: 0 1px 0 var(--border-color);
    }
    .navbar-brand { flex-shrink: 0; }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text-primary);
    }
    .brand-icon { font-size: 20px; }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .navbar-nav {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .user-menu-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }
    .username { font-size: 14px; }
    .active-link { color: var(--accent-primary) !important; }
    .register-btn { margin-left: 4px; }
    .logout-btn { color: var(--error-color); }
  `],
})
export class NavbarComponent {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
}
