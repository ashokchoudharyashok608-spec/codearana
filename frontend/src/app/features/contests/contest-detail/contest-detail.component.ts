import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';
import { ContestsApiService, PaymentsApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-contest-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatTabsModule, MatProgressSpinnerModule],
  template: `
    <div class="contest-detail-page">
      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="60"></mat-spinner></div>
      } @else if (contest()) {
        <!-- Header -->
        <div class="contest-header">
          <div class="header-inner">
            <div class="header-left">
              <div class="breadcrumb">
                <a routerLink="/contests">Contests</a>
                <mat-icon>chevron_right</mat-icon>
                <span>{{ contest()!.title }}</span>
              </div>
              <h1>{{ contest()!.title }}</h1>
              <div class="header-badges">
                <span class="type-badge" [class]="contest()!.type.toLowerCase()">{{ contest()!.type }}</span>
                <span class="status-badge" [class]="contest()!.status.toLowerCase()">{{ contest()!.status }}</span>
                @if (contest()!.entryFee === 0) {
                  <span class="free-badge">FREE</span>
                }
              </div>
            </div>
            <div class="header-right">
              <!-- Countdown -->
              @if (contest()!.status === 'REGISTRATION' || contest()!.status === 'LIVE') {
                <div class="countdown">
                  <div class="countdown-label">
                    {{ contest()!.status === 'LIVE' ? 'Ends in' : 'Starts in' }}
                  </div>
                  <div class="countdown-timer">{{ countdown() }}</div>
                </div>
              }
              <!-- Register / Join Button -->
              @if (contest()!.status === 'REGISTRATION') {
                @if (auth.isAuthenticated()) {
                  @if (contest()!.isRegistered) {
                    <button mat-raised-button disabled class="registered-btn">
                      <mat-icon>check</mat-icon> Registered
                    </button>
                  } @else {
                    <button mat-raised-button color="primary" (click)="register()" [disabled]="registering()">
                      @if (registering()) { <mat-spinner diameter="16"></mat-spinner> }
                      @else {
                        <mat-icon>how_to_reg</mat-icon>
                        {{ contest()!.entryFee > 0 ? 'Pay & Register ($' + (contest()!.entryFee/100).toFixed(2) + ')' : 'Register Free' }}
                      }
                    </button>
                  }
                } @else {
                  <a mat-raised-button color="primary" routerLink="/auth/login">Sign in to Register</a>
                }
              }
              @if (contest()!.status === 'LIVE' && contest()!.isRegistered) {
                <div class="live-indicator">
                  <span class="live-dot"></span> LIVE
                </div>
              }
            </div>
          </div>

          <!-- Contest Stats -->
          <div class="contest-stats">
            <div class="stat">
              <mat-icon>people</mat-icon>
              <span>{{ contest()!._count?.participants || 0 }} participants</span>
            </div>
            <div class="stat">
              <mat-icon>quiz</mat-icon>
              <span>{{ contest()!.problems?.length || 0 }} problems</span>
            </div>
            <div class="stat">
              <mat-icon>schedule</mat-icon>
              <span>{{ contest()!.startTime | date:'MMM d, h:mm a' }}</span>
            </div>
            @if (contest()!.prizePool > 0) {
              <div class="stat prize">
                <mat-icon>emoji_events</mat-icon>
                <span>Prize Pool: \${{ (contest()!.prizePool / 100).toFixed(0) }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs-container">
          <mat-tab-group animationDuration="0">
            <!-- Overview -->
            <mat-tab label="Overview">
              <div class="tab-content">
                <div class="overview-grid">
                  <div class="overview-main">
                    <h3>About this contest</h3>
                    <p class="description">{{ contest()!.description }}</p>

                    @if (contest()!.type === 'ICPC') {
                      <div class="scoring-info">
                        <h4>Scoring (ICPC Style)</h4>
                        <ul>
                          <li>Problems are scored by number solved, then by total penalty time</li>
                          <li>Penalty: elapsed time at first AC + 20 min per wrong attempt</li>
                          <li>No partial credit — full solve or nothing</li>
                        </ul>
                      </div>
                    } @else {
                      <div class="scoring-info">
                        <h4>Scoring (IOI Style)</h4>
                        <ul>
                          <li>Partial credit for passing test cases</li>
                          <li>Each problem has its own point value</li>
                          <li>Best submission across all attempts counts</li>
                        </ul>
                      </div>
                    }
                  </div>

                  <!-- Problems list -->
                  @if (contest()!.problems?.length > 0) {
                    <div class="problems-list">
                      <h3>Problems</h3>
                      @for (cp of contest()!.problems; track cp.label) {
                        <a
                          [routerLink]="['/problems', cp.problem?.slug]"
                          class="problem-item"
                          [class.disabled]="contest()!.status === 'REGISTRATION'">
                          <span class="problem-label">{{ cp.label }}</span>
                          <span class="problem-title">{{ cp.problem?.title }}</span>
                          <span class="problem-points">{{ cp.points }} pts</span>
                          <span class="diff-dot" [class]="cp.problem?.difficulty?.toLowerCase()"></span>
                        </a>
                      }
                    </div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- Live Scoreboard -->
            <mat-tab label="Scoreboard">
              <div class="tab-content">
                @if (scoreboard().length === 0) {
                  <div class="empty-scoreboard">
                    <mat-icon>leaderboard</mat-icon>
                    <p>No participants yet. Be the first to register!</p>
                  </div>
                } @else {
                  <div class="scoreboard-wrap">
                    <table class="scoreboard-table">
                      <thead>
                        <tr>
                          <th class="rank-col">#</th>
                          <th>Participant</th>
                          <th>Score</th>
                          @if (contest()!.type === 'ICPC') { <th>Penalty</th> }
                          <th>Solved</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of scoreboard(); track entry.userId; let i = $index) {
                          <tr [class.highlight]="entry.userId === auth.user()?.id">
                            <td class="rank-col">
                              @if (i === 0) { 🥇 }
                              @else if (i === 1) { 🥈 }
                              @else if (i === 2) { 🥉 }
                              @else { {{ entry.rank }} }
                            </td>
                            <td>
                              <a [routerLink]="['/profile', entry.username]" class="user-link">
                                @if (entry.avatarUrl) {
                                  <img [src]="entry.avatarUrl" class="avatar" [alt]="entry.username">
                                } @else {
                                  <div class="avatar-placeholder">{{ entry.username[0].toUpperCase() }}</div>
                                }
                                <span>{{ entry.displayName || entry.username }}</span>
                              </a>
                            </td>
                            <td class="score-cell">{{ entry.score }}</td>
                            @if (contest()!.type === 'ICPC') {
                              <td class="penalty-cell">{{ entry.penalty }}m</td>
                            }
                            <td>{{ entry.solvedCount }}</td>
                            <td class="rating-cell">{{ entry.rating }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      }
    </div>
  `,
  styles: [`
    .contest-detail-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .loading-center { display: flex; justify-content: center; padding: 120px; }
    .contest-header { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .header-inner { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 24px; }
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
    .breadcrumb a { color: var(--accent-primary); text-decoration: none; }
    .breadcrumb mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .header-left h1 { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
    .header-badges { display: flex; gap: 8px; align-items: center; }
    .type-badge, .status-badge, .free-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
    .type-badge.icpc { background: rgba(88,166,255,.15); color: #58a6ff; }
    .type-badge.ioi { background: rgba(163,113,247,.15); color: #a371f7; }
    .status-badge.registration { background: rgba(63,185,80,.15); color: #3fb950; }
    .status-badge.live { background: rgba(248,81,73,.15); color: #f85149; }
    .status-badge.ended { background: rgba(139,148,158,.15); color: #8b949e; }
    .free-badge { background: rgba(63,185,80,.15); color: #3fb950; }
    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 16px; flex-shrink: 0; }
    .countdown { text-align: right; }
    .countdown-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
    .countdown-timer { font-size: 28px; font-weight: 700; font-family: monospace; color: var(--accent-primary); }
    .registered-btn { background: rgba(63,185,80,.15) !important; color: #3fb950 !important; }
    .live-indicator { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #f85149; }
    .live-dot { width: 10px; height: 10px; background: #f85149; border-radius: 50%; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .contest-stats { display: flex; gap: 24px; flex-wrap: wrap; }
    .stat { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); }
    .stat.prize { color: #f2cc60; }
    .stat mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tabs-container { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
    .tab-content { padding: 32px; }
    .overview-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
    .overview-main h3, .problems-list h3 { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
    .description { color: var(--text-secondary); line-height: 1.7; }
    .scoring-info { background: var(--bg-tertiary); border-radius: 8px; padding: 16px; margin-top: 20px; }
    .scoring-info h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px; }
    .scoring-info ul { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 14px; }
    .scoring-info li { margin-bottom: 6px; }
    .problem-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      margin-bottom: 8px;
      text-decoration: none;
      color: inherit;
      transition: background 0.2s;
    }
    .problem-item:hover { background: var(--bg-primary); }
    .problem-item.disabled { pointer-events: none; opacity: 0.5; }
    .problem-label { font-weight: 700; font-size: 16px; min-width: 24px; }
    .problem-title { flex: 1; font-size: 14px; }
    .problem-points { font-size: 13px; color: var(--accent-primary); font-weight: 600; }
    .diff-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .diff-dot.easy { background: #3fb950; }
    .diff-dot.medium { background: #d2a707; }
    .diff-dot.hard { background: #f85149; }
    .empty-scoreboard { text-align: center; padding: 80px; color: var(--text-secondary); }
    .empty-scoreboard mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4; }
    .scoreboard-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .scoreboard-table th { padding: 12px 16px; text-align: left; color: var(--text-secondary); border-bottom: 2px solid var(--border-color); font-weight: 500; font-size: 13px; }
    .scoreboard-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .scoreboard-table tr.highlight { background: rgba(88,166,255,.06); }
    .rank-col { width: 60px; font-weight: 700; font-size: 16px; }
    .user-link { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
    .avatar, .avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; }
    .avatar-placeholder { background: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: white; }
    .score-cell { font-weight: 700; color: var(--accent-primary); }
    .penalty-cell { color: var(--text-secondary); font-family: monospace; }
    .rating-cell { font-family: monospace; color: var(--text-secondary); }
  `],
})
export class ContestDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private contestsApi = inject(ContestsApiService);
  private paymentsApi = inject(PaymentsApiService);
  private socket = inject(SocketService);
  private snack = inject(MatSnackBar);
  auth = inject(AuthService);

  contest = signal<any>(null);
  scoreboard = signal<any[]>([]);
  loading = signal(true);
  registering = signal(false);
  countdown = signal('--:--:--');

  private socketSub?: Subscription;
  private countdownInterval?: any;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.contestsApi.getContest(slug).subscribe({
      next: (c) => {
        this.contest.set(c);
        this.loading.set(false);
        this.startCountdown();
        this.loadScoreboard(c.id);

        if (c.status === 'LIVE') {
          this.socket.connect();
          this.socket.joinContest(c.id);
          this.socketSub = this.socket.onScoreboardUpdate().subscribe(sb => this.scoreboard.set(sb));
        }
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
    if (this.contest()) this.socket.leaveContest(this.contest()!.id);
    clearInterval(this.countdownInterval);
  }

  loadScoreboard(contestId: string) {
    this.contestsApi.getScoreboard(contestId).subscribe(sb => this.scoreboard.set(sb));
  }

  register() {
    const c = this.contest()!;
    if (c.entryFee > 0) {
      this.registering.set(true);
      this.paymentsApi.createCheckout({ type: 'contest_entry', contestId: c.id }).subscribe({
        next: (res) => { window.location.href = res.url!; },
        error: () => this.registering.set(false),
      });
    } else {
      this.registering.set(true);
      this.contestsApi.register(c.id).subscribe({
        next: () => {
          this.snack.open('Successfully registered!', 'OK', { duration: 3000 });
          this.contest.update(co => ({ ...co, isRegistered: true }));
          this.registering.set(false);
        },
        error: () => this.registering.set(false),
      });
    }
  }

  startCountdown() {
    const c = this.contest()!;
    const target = c.status === 'LIVE' ? new Date(c.endTime) : new Date(c.startTime);

    this.countdownInterval = setInterval(() => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { clearInterval(this.countdownInterval); this.countdown.set('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.countdown.set(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
  }
}
