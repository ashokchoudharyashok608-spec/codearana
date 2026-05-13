import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContestsApiService, Contest } from '../../../core/services/api.service';

@Component({
  selector: 'app-contests-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatTabsModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    <div class="contests-page">
      <div class="page-header">
        <h1>Contests</h1>
        <p>Compete in real-time programming contests</p>
      </div>

      <mat-tab-group (selectedIndexChange)="onTabChange($event)" animationDuration="0">
        <mat-tab label="Upcoming">
          <div class="contests-grid">
            @if (loading()) { <div class="loading"><mat-spinner diameter="40"></mat-spinner></div> }
            @for (c of upcoming(); track c.id) {
              <ng-container [ngTemplateOutlet]="contestCard" [ngTemplateOutletContext]="{c}"></ng-container>
            } @empty {
              <div class="empty"><mat-icon>event</mat-icon><p>No upcoming contests. Check back soon!</p></div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Live">
          <div class="contests-grid">
            @for (c of live(); track c.id) {
              <ng-container [ngTemplateOutlet]="contestCard" [ngTemplateOutletContext]="{c}"></ng-container>
            } @empty {
              <div class="empty"><mat-icon>live_tv</mat-icon><p>No live contests right now.</p></div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Past">
          <div class="contests-grid">
            @for (c of past(); track c.id) {
              <ng-container [ngTemplateOutlet]="contestCard" [ngTemplateOutletContext]="{c}"></ng-container>
            } @empty {
              <div class="empty"><mat-icon>history</mat-icon><p>No past contests.</p></div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Contest Card Template -->
    <ng-template #contestCard let-c="c">
      <a [routerLink]="['/contests', c.slug]" class="contest-card">
        <div class="card-top">
          <span class="type-badge" [class]="c.type.toLowerCase()">{{ c.type }}</span>
          <span class="status-badge" [class]="c.status.toLowerCase()">{{ c.status }}</span>
        </div>
        <h3 class="card-title">{{ c.title }}</h3>
        <p class="card-desc">{{ c.description | slice:0:120 }}{{ c.description.length > 120 ? '...' : '' }}</p>
        <div class="card-meta">
          <div class="meta-row">
            <mat-icon>schedule</mat-icon>
            <span>{{ c.startTime | date:'MMM d, h:mm a' }}</span>
          </div>
          <div class="meta-row">
            <mat-icon>hourglass_empty</mat-icon>
            <span>{{ getDuration(c.startTime, c.endTime) }}</span>
          </div>
          <div class="meta-row">
            <mat-icon>people</mat-icon>
            <span>{{ c._count?.participants || 0 }} participants</span>
          </div>
          <div class="meta-row">
            <mat-icon>{{ c.entryFee === 0 ? 'lock_open' : 'paid' }}</mat-icon>
            <span>{{ c.entryFee === 0 ? 'Free Entry' : '$' + (c.entryFee / 100).toFixed(2) }}</span>
          </div>
        </div>
        @if (c.prizePool && c.prizePool > 0) {
          <div class="prize-pool">
            <mat-icon>emoji_events</mat-icon>
            Prize Pool: \${{ (c.prizePool / 100).toFixed(0) }}
          </div>
        }
        <div class="card-action">
          <span>View Details</span>
          <mat-icon>arrow_forward</mat-icon>
        </div>
      </a>
    </ng-template>
  `,
  styles: [`
    .contests-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 32px; }
    .page-header h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; }
    .page-header p { color: var(--text-secondary); margin: 0; }
    .contests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; padding: 24px 0; }
    .loading { grid-column: 1/-1; display: flex; justify-content: center; padding: 60px; }
    .empty { grid-column: 1/-1; text-align: center; padding: 80px; color: var(--text-secondary); }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4; }
    .contest-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .contest-card:hover { transform: translateY(-3px); border-color: var(--accent-primary); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .card-top { display: flex; align-items: center; justify-content: space-between; }
    .type-badge, .status-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .type-badge.icpc { background: rgba(88,166,255,.15); color: #58a6ff; }
    .type-badge.ioi { background: rgba(163,113,247,.15); color: #a371f7; }
    .status-badge.registration { background: rgba(63,185,80,.15); color: #3fb950; }
    .status-badge.live { background: rgba(248,81,73,.15); color: #f85149; animation: blink 1.5s infinite; }
    .status-badge.ended, .status-badge.results { background: rgba(139,148,158,.15); color: #8b949e; }
    .status-badge.draft { background: rgba(210,167,7,.15); color: #d2a707; }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .card-title { font-size: 18px; font-weight: 600; margin: 0; line-height: 1.3; }
    .card-desc { color: var(--text-secondary); font-size: 13px; line-height: 1.5; margin: 0; }
    .card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .meta-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
    .meta-row mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .prize-pool { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #f2cc60; background: rgba(242,204,96,.1); padding: 8px 12px; border-radius: 6px; }
    .card-action { display: flex; align-items: center; justify-content: space-between; margin-top: auto; color: var(--accent-primary); font-size: 14px; font-weight: 500; }
  `],
})
export class ContestsListComponent implements OnInit {
  private api = inject(ContestsApiService);

  loading = signal(true);
  upcoming = signal<Contest[]>([]);
  live = signal<Contest[]>([]);
  past = signal<Contest[]>([]);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    Promise.all([
      this.api.getContests({ status: 'REGISTRATION' }).toPromise(),
      this.api.getContests({ status: 'LIVE' }).toPromise(),
      this.api.getContests({ status: 'ENDED' }).toPromise(),
    ]).then(([reg, live, ended]) => {
      this.upcoming.set(reg?.data || []);
      this.live.set(live?.data || []);
      this.past.set(ended?.data || []);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  onTabChange(idx: number) { /* could lazy-load per tab */ }

  getDuration(start: string, end: string): string {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
  }
}
