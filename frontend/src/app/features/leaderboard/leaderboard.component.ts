import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { LeaderboardApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatProgressSpinnerModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  template: `
    <div class="leaderboard-page">
      <div class="page-header">
        <div class="header-content">
          <h1>🏆 Global Leaderboard</h1>
          <p class="subtitle">Ranked by ELO-style competitive rating</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner /></div>
      } @else {
        <!-- Top 3 Podium -->
        @if (page === 1 && users().length >= 3) {
          <div class="podium">
            <div class="podium-card silver">
              <div class="podium-rank">2</div>
              <div class="podium-avatar">{{ users()[1].username.charAt(0).toUpperCase() }}</div>
              <a [routerLink]="['/profile', users()[1].username]" class="podium-name">{{ users()[1].username }}</a>
              <div class="podium-rating">{{ users()[1].rating }}</div>
              <div class="podium-solved">{{ users()[1].totalSolved }} solved</div>
            </div>
            <div class="podium-card gold">
              <div class="podium-rank crown">👑</div>
              <div class="podium-avatar large">{{ users()[0].username.charAt(0).toUpperCase() }}</div>
              <a [routerLink]="['/profile', users()[0].username]" class="podium-name">{{ users()[0].username }}</a>
              <div class="podium-rating">{{ users()[0].rating }}</div>
              <div class="podium-solved">{{ users()[0].totalSolved }} solved</div>
            </div>
            <div class="podium-card bronze">
              <div class="podium-rank">3</div>
              <div class="podium-avatar">{{ users()[2].username.charAt(0).toUpperCase() }}</div>
              <a [routerLink]="['/profile', users()[2].username]" class="podium-name">{{ users()[2].username }}</a>
              <div class="podium-rating">{{ users()[2].rating }}</div>
              <div class="podium-solved">{{ users()[2].totalSolved }} solved</div>
            </div>
          </div>
        }

        <!-- Full Table -->
        <div class="leaderboard-table">
          <div class="table-header">
            <span class="col-rank">#</span>
            <span class="col-user">User</span>
            <span class="col-rating">Rating</span>
            <span class="col-max-rating">Peak</span>
            <span class="col-solved">Solved</span>
          </div>

          @for (user of users(); track user.id) {
            <a [routerLink]="['/profile', user.username]" class="table-row" [class.current-user]="isCurrentUser(user.id)">
              <span class="col-rank">
                @if (user.rank <= 3 && page === 1) {
                  <span class="medal">{{ ['🥇','🥈','🥉'][user.rank - 1] }}</span>
                } @else {
                  <span class="rank-num">{{ user.rank }}</span>
                }
              </span>
              <span class="col-user">
                <div class="user-avatar" [style.background]="avatarColor(user.username)">
                  {{ user.username.charAt(0).toUpperCase() }}
                </div>
                <div class="user-info">
                  <span class="username">{{ user.username }}</span>
                  @if (user.displayName && user.displayName !== user.username) {
                    <span class="display-name">{{ user.displayName }}</span>
                  }
                </div>
              </span>
              <span class="col-rating">
                <span class="rating-value" [class]="ratingClass(user.rating)">{{ user.rating }}</span>
              </span>
              <span class="col-max-rating">
                <span class="max-rating">{{ user.maxRating }}</span>
              </span>
              <span class="col-solved">{{ user.totalSolved }}</span>
            </a>
          }
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize"
          [pageSizeOptions]="[50, 100]"
          (page)="onPage($event)"
          class="paginator"
        />
      }
    </div>
  `,
  styles: [`
    .leaderboard-page { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    .page-header { margin-bottom: 40px; text-align: center; }
    .page-header h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; }
    .subtitle { color: var(--text-secondary); margin: 0; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }

    /* Podium */
    .podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 48px;
      padding: 24px;
    }
    .podium-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 24px;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      min-width: 160px;
      transition: transform .2s;
    }
    .podium-card:hover { transform: translateY(-4px); }
    .podium-card.gold { border-color: #f2cc60; background: linear-gradient(180deg, rgba(242,204,96,.1) 0%, var(--bg-secondary) 100%); }
    .podium-card.silver { border-color: #8b949e; }
    .podium-card.bronze { border-color: #c97c3a; }
    .podium-rank { font-size: 18px; font-weight: 700; color: var(--text-secondary); }
    .podium-rank.crown { font-size: 28px; }
    .podium-avatar {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700;
    }
    .podium-avatar.large { width: 72px; height: 72px; font-size: 28px; }
    .podium-name { font-weight: 700; color: var(--text-primary); text-decoration: none; font-size: 15px; }
    .podium-name:hover { color: var(--accent-primary); }
    .podium-rating { font-size: 20px; font-weight: 700; color: var(--accent-primary); }
    .podium-solved { font-size: 12px; color: var(--text-secondary); }

    /* Table */
    .leaderboard-table { border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
    .table-header {
      display: grid;
      grid-template-columns: 60px 1fr 100px 80px 80px;
      padding: 12px 20px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-color);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .table-row {
      display: grid;
      grid-template-columns: 60px 1fr 100px 80px 80px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-color);
      text-decoration: none;
      color: inherit;
      align-items: center;
      transition: background .15s;
    }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: var(--bg-tertiary); }
    .table-row.current-user { background: rgba(88,166,255,.06); }

    .medal { font-size: 20px; }
    .rank-num { font-size: 15px; font-weight: 600; color: var(--text-secondary); }

    .col-user { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
      color: #fff;
    }
    .user-info { display: flex; flex-direction: column; }
    .username { font-weight: 600; font-size: 15px; }
    .display-name { font-size: 12px; color: var(--text-secondary); }

    .rating-value { font-weight: 700; font-size: 16px; }
    .rating-value.newbie { color: #8b949e; }
    .rating-value.pupil { color: #3fb950; }
    .rating-value.specialist { color: #1f6feb; }
    .rating-value.expert { color: #388bfd; }
    .rating-value.candidate-master { color: #d2a8ff; }
    .rating-value.master { color: #f2cc60; }
    .rating-value.grandmaster { color: #f85149; }

    .max-rating { font-size: 14px; color: var(--text-secondary); }
    .col-solved { font-size: 14px; font-weight: 500; }

    .paginator { background: transparent; margin-top: 16px; }

    @media (max-width: 600px) {
      .podium { flex-direction: column; align-items: center; }
      .table-header, .table-row { grid-template-columns: 48px 1fr 80px 70px; }
      .col-max-rating { display: none; }
    }
  `],
})
export class LeaderboardComponent implements OnInit {
  private api = inject(LeaderboardApiService);
  private authService = inject(AuthService);

  users = signal<any[]>([]);
  total = signal(0);
  loading = signal(true);
  page = 1;
  pageSize = 50;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getLeaderboard({ page: this.page, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }

  isCurrentUser(id: string) { return this.authService.user()?.id === id; }

  ratingClass(rating: number): string {
    if (rating < 1200) return 'newbie';
    if (rating < 1400) return 'pupil';
    if (rating < 1600) return 'specialist';
    if (rating < 1800) return 'expert';
    if (rating < 2000) return 'candidate-master';
    if (rating < 2400) return 'master';
    return 'grandmaster';
  }

  avatarColor(username: string): string {
    const colors = ['#1f6feb','#388bfd','#d2a8ff','#3fb950','#f2cc60','#ff7b72','#ffa657'];
    let hash = 0;
    for (const c of username) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}
