import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { UsersApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, MatChipsModule, MatButtonModule],
  template: `
    <div class="profile-page">
      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="60"></mat-spinner></div>
      } @else if (profile()) {
        <div class="profile-layout">
          <!-- Sidebar -->
          <aside class="profile-sidebar">
            <div class="avatar-section">
              @if (profile()!.avatarUrl) {
                <img [src]="profile()!.avatarUrl" class="avatar-large" [alt]="profile()!.displayName">
              } @else {
                <div class="avatar-fallback">{{ profile()!.username[0].toUpperCase() }}</div>
              }
              <h2 class="display-name">{{ profile()!.displayName || profile()!.username }}</h2>
              <p class="username">@{{ profile()!.username }}</p>
              <span class="role-badge" [class]="profile()!.role.toLowerCase()">{{ profile()!.role }}</span>
            </div>

            @if (profile()!.bio) {
              <p class="bio">{{ profile()!.bio }}</p>
            }

            @if (isOwnProfile()) {
              <a mat-stroked-button routerLink="/settings" class="edit-btn">
                <mat-icon>edit</mat-icon> Edit Profile
              </a>
            }

            <!-- Stats -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value rating-value">{{ profile()!.rating }}</div>
                <div class="stat-label">Rating</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ profile()!.maxRating }}</div>
                <div class="stat-label">Max Rating</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ profile()!.totalSolved }}</div>
                <div class="stat-label">Solved</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ profile()!.totalSubmissions }}</div>
                <div class="stat-label">Submissions</div>
              </div>
            </div>

            <!-- Difficulty Breakdown -->
            <div class="difficulty-breakdown">
              <h4>Problems by Difficulty</h4>
              @for (d of profile()!.solvedByDifficulty; track d.difficulty) {
                <div class="diff-row">
                  <span class="diff-label" [class]="d.difficulty.toLowerCase()">{{ d.difficulty }}</span>
                  <div class="diff-bar-bg">
                    <div class="diff-bar" [class]="d.difficulty.toLowerCase()" [style.width.%]="(d.count / profile()!.totalSolved) * 100"></div>
                  </div>
                  <span class="diff-count">{{ d.count }}</span>
                </div>
              }
            </div>

            <!-- Achievements -->
            @if (profile()!.achievements?.length > 0) {
              <div class="achievements">
                <h4>Achievements</h4>
                <div class="achievement-grid">
                  @for (a of profile()!.achievements.slice(0, 6); track a.id) {
                    <div class="achievement-badge" [title]="a.title + ': ' + a.description">
                      🏅
                    </div>
                  }
                </div>
                @if (profile()!.achievements.length > 6) {
                  <p class="more-achievements">+{{ profile()!.achievements.length - 6 }} more</p>
                }
              </div>
            }
          </aside>

          <!-- Main Content -->
          <main class="profile-main">
            <!-- Submission Heatmap -->
            <div class="heatmap-section">
              <h3>Submission Activity</h3>
              <div class="heatmap-wrapper">
                <div class="heatmap">
                  @for (cell of heatmapCells(); track cell.date) {
                    <div
                      class="heatmap-cell"
                      [class]="'level-' + cell.level"
                      [title]="cell.date + ': ' + cell.count + ' submissions'">
                    </div>
                  }
                </div>
                <div class="heatmap-legend">
                  <span>Less</span>
                  @for (l of [0,1,2,3,4]; track l) {
                    <div class="legend-cell" [class]="'level-' + l"></div>
                  }
                  <span>More</span>
                </div>
              </div>
            </div>

            <!-- Verdict Distribution -->
            <div class="verdict-section">
              <h3>Verdict Distribution</h3>
              <div class="verdict-bars">
                @for (v of profile()!.verdictCounts; track v.verdict) {
                  <div class="verdict-row">
                    <span class="verdict-label">{{ v.verdict.replace(/_/g,' ') }}</span>
                    <div class="verdict-bar-bg">
                      <div class="verdict-bar" [class]="verdictClass(v.verdict)"
                        [style.width.%]="(v.count / profile()!.totalSubmissions) * 100">
                      </div>
                    </div>
                    <span class="verdict-count">{{ v.count }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Recent Solved -->
            <div class="recent-section">
              <h3>Recently Solved</h3>
              @if (profile()!.recentSolved?.length === 0) {
                <p class="empty-text">No solved problems yet.</p>
              } @else {
                <div class="recent-list">
                  @for (sub of profile()!.recentSolved; track sub.id) {
                    <a [routerLink]="['/problems', sub.problem.slug]" class="recent-item">
                      <span class="diff-dot" [class]="sub.problem.difficulty.toLowerCase()"></span>
                      <span class="recent-title">{{ sub.problem.title }}</span>
                      <span class="recent-diff" [class]="sub.problem.difficulty.toLowerCase()">{{ sub.problem.difficulty }}</span>
                      <span class="recent-lang">{{ sub.language }}</span>
                      <span class="recent-date">{{ sub.createdAt | date:'MMM d' }}</span>
                    </a>
                  }
                </div>
              }
            </div>
          </main>
        </div>
      } @else {
        <div class="not-found">
          <mat-icon>person_off</mat-icon>
          <h2>User not found</h2>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .loading-center { display: flex; justify-content: center; padding: 120px; }
    .profile-layout { display: grid; grid-template-columns: 300px 1fr; gap: 32px; }
    .profile-sidebar { display: flex; flex-direction: column; gap: 24px; }
    .avatar-section { text-align: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; }
    .avatar-large { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; }
    .avatar-fallback { width: 100px; height: 100px; border-radius: 50%; background: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 700; color: white; margin: 0 auto 12px; }
    .display-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    .username { color: var(--text-secondary); font-size: 14px; margin: 0 0 12px; }
    .role-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
    .role-badge.admin { background: rgba(248,81,73,.15); color: #f85149; }
    .role-badge.setter { background: rgba(163,113,247,.15); color: #a371f7; }
    .role-badge.user { background: rgba(139,148,158,.15); color: #8b949e; }
    .bio { color: var(--text-secondary); font-size: 14px; line-height: 1.6; text-align: center; margin: 0; }
    .edit-btn { width: 100%; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .rating-value { color: var(--accent-primary); }
    .stat-label { font-size: 12px; color: var(--text-secondary); }
    .difficulty-breakdown { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
    .difficulty-breakdown h4 { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: var(--text-secondary); }
    .diff-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .diff-label { width: 60px; font-size: 12px; font-weight: 600; }
    .diff-label.easy { color: #3fb950; }
    .diff-label.medium { color: #d2a707; }
    .diff-label.hard { color: #f85149; }
    .diff-bar-bg { flex: 1; height: 8px; background: var(--bg-tertiary); border-radius: 4px; }
    .diff-bar { height: 100%; border-radius: 4px; transition: width .5s; }
    .diff-bar.easy { background: #3fb950; }
    .diff-bar.medium { background: #d2a707; }
    .diff-bar.hard { background: #f85149; }
    .diff-count { font-size: 13px; font-weight: 600; min-width: 32px; text-align: right; }
    .achievements { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
    .achievements h4 { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: var(--text-secondary); }
    .achievement-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .achievement-badge { font-size: 24px; text-align: center; cursor: default; }
    .more-achievements { font-size: 13px; color: var(--text-secondary); margin: 8px 0 0; }
    .profile-main { display: flex; flex-direction: column; gap: 24px; }
    .heatmap-section, .verdict-section, .recent-section {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
    }
    .heatmap-section h3, .verdict-section h3, .recent-section h3 { margin: 0 0 20px; font-size: 16px; font-weight: 600; }
    .heatmap-wrapper { overflow-x: auto; }
    .heatmap { display: grid; grid-template-rows: repeat(7, 12px); grid-auto-flow: column; gap: 3px; }
    .heatmap-cell { width: 12px; height: 12px; border-radius: 2px; }
    .heatmap-cell.level-0 { background: var(--bg-tertiary); }
    .heatmap-cell.level-1 { background: #0e4429; }
    .heatmap-cell.level-2 { background: #006d32; }
    .heatmap-cell.level-3 { background: #26a641; }
    .heatmap-cell.level-4 { background: #39d353; }
    .heatmap-legend { display: flex; align-items: center; gap: 4px; margin-top: 12px; font-size: 12px; color: var(--text-secondary); }
    .legend-cell { width: 12px; height: 12px; border-radius: 2px; }
    .legend-cell.level-0 { background: var(--bg-tertiary); }
    .legend-cell.level-1 { background: #0e4429; }
    .legend-cell.level-2 { background: #006d32; }
    .legend-cell.level-3 { background: #26a641; }
    .legend-cell.level-4 { background: #39d353; }
    .verdict-bars { display: flex; flex-direction: column; gap: 10px; }
    .verdict-row { display: flex; align-items: center; gap: 12px; }
    .verdict-label { width: 160px; font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
    .verdict-bar-bg { flex: 1; height: 8px; background: var(--bg-tertiary); border-radius: 4px; }
    .verdict-bar { height: 100%; border-radius: 4px; transition: width .5s; }
    .verdict-bar.ac { background: #3fb950; }
    .verdict-bar.wa { background: #f85149; }
    .verdict-bar.tle { background: #d2a707; }
    .verdict-bar.ce { background: #8b949e; }
    .verdict-bar.re { background: #f85149; }
    .verdict-count { font-size: 13px; font-weight: 600; min-width: 40px; text-align: right; }
    .recent-list { display: flex; flex-direction: column; gap: 8px; }
    .recent-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; text-decoration: none; color: inherit; transition: background .2s; }
    .recent-item:hover { background: var(--bg-primary); }
    .diff-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .diff-dot.easy { background: #3fb950; }
    .diff-dot.medium { background: #d2a707; }
    .diff-dot.hard { background: #f85149; }
    .recent-title { flex: 1; font-size: 14px; }
    .recent-diff { font-size: 12px; font-weight: 600; }
    .recent-diff.easy { color: #3fb950; }
    .recent-diff.medium { color: #d2a707; }
    .recent-diff.hard { color: #f85149; }
    .recent-lang, .recent-date { font-size: 13px; color: var(--text-secondary); }
    .empty-text { color: var(--text-secondary); text-align: center; padding: 40px 0; }
    .not-found { text-align: center; padding: 120px; color: var(--text-secondary); }
    .not-found mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.4; }
    @media (max-width: 768px) { .profile-layout { grid-template-columns: 1fr; } }
  `],
})
export class ProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private usersApi = inject(UsersApiService);
  auth = inject(AuthService);

  profile = signal<any>(null);
  loading = signal(true);
  heatmapCells = signal<Array<{ date: string; count: number; level: number }>>([]);

  isOwnProfile() {
    return this.auth.user()?.username === this.profile()?.username;
  }

  ngOnInit() {
    const username = this.route.snapshot.paramMap.get('username')!;
    this.usersApi.getProfile(username).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.buildHeatmap(p.heatmap);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  buildHeatmap(heatmap: Array<{ date: string; count: number }>) {
    const dataMap = new Map(heatmap.map(h => [h.date, h.count]));
    const cells: Array<{ date: string; count: number; level: number }> = [];
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = dataMap.get(dateStr) || 0;
      cells.push({ date: dateStr, count, level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4 });
    }
    this.heatmapCells.set(cells);
  }

  verdictClass(verdict: string): string {
    const m: Record<string, string> = { ACCEPTED: 'ac', WRONG_ANSWER: 'wa', TIME_LIMIT_EXCEEDED: 'tle', COMPILATION_ERROR: 'ce', RUNTIME_ERROR: 're' };
    return m[verdict] || '';
  }
}
