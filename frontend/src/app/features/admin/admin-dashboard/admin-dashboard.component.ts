import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AdminApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule, NgApexchartsModule,
  ],
  template: `
    <div class="admin-page">
      <div class="admin-header">
        <h1>⚙ Admin Dashboard</h1>
        <p class="subtitle">Platform overview and system health</p>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner /></div>
      } @else if (stats()) {
        <!-- KPI Cards -->
        <div class="kpi-grid">
          @for (kpi of kpis(); track kpi.label) {
            <div class="kpi-card" [style.--accent]="kpi.color">
              <div class="kpi-icon">{{ kpi.icon }}</div>
              <div class="kpi-body">
                <div class="kpi-value">{{ kpi.value | number }}</div>
                <div class="kpi-label">{{ kpi.label }}</div>
              </div>
            </div>
          }
        </div>

        <!-- System Health -->
        <div class="section-row">
          <mat-card class="health-card">
            <mat-card-header>
              <mat-card-title>System Health</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="health-items">
                <div class="health-item">
                  <span class="health-dot" [class.green]="stats().system.judge0 === 'healthy'" [class.red]="stats().system.judge0 !== 'healthy'"></span>
                  <span>Judge0</span>
                  <span class="health-status" [class.ok]="stats().system.judge0 === 'healthy'">{{ stats().system.judge0 }}</span>
                </div>
                <div class="health-item">
                  <span class="health-dot green"></span>
                  <span>Queue — Waiting</span>
                  <span class="health-value">{{ stats().queue.waiting }}</span>
                </div>
                <div class="health-item">
                  <span class="health-dot green"></span>
                  <span>Queue — Active</span>
                  <span class="health-value">{{ stats().queue.active }}</span>
                </div>
                <div class="health-item">
                  <span class="health-dot" [class.green]="stats().queue.failed === 0" [class.yellow]="stats().queue.failed > 0"></span>
                  <span>Queue — Failed</span>
                  <span class="health-value">{{ stats().queue.failed }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="verdict-card">
            <mat-card-header>
              <mat-card-title>Verdict Distribution</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <apx-chart
                [series]="verdictChart().series"
                [chart]="verdictChart().chart"
                [labels]="verdictChart().labels"
                [colors]="verdictChart().colors"
                [legend]="verdictChart().legend"
                [theme]="verdictChart().theme"
              />
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Submissions Over Time -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Submissions — Last 30 Days</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <apx-chart
              [series]="submissionsChart().series"
              [chart]="submissionsChart().chart"
              [xaxis]="submissionsChart().xaxis"
              [stroke]="submissionsChart().stroke"
              [fill]="submissionsChart().fill"
              [colors]="submissionsChart().colors"
              [theme]="submissionsChart().theme"
              [tooltip]="submissionsChart().tooltip"
              [grid]="submissionsChart().grid"
            />
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <a mat-raised-button routerLink="/admin/users">
              <mat-icon>people</mat-icon> Manage Users
            </a>
            <a mat-raised-button routerLink="/admin/problems">
              <mat-icon>code</mat-icon> Manage Problems
            </a>
            <a mat-raised-button routerLink="/admin/submissions">
              <mat-icon>fact_check</mat-icon> Monitor Submissions
            </a>
            <a mat-raised-button routerLink="/contests">
              <mat-icon>emoji_events</mat-icon> View Contests
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }
    .admin-header { margin-bottom: 32px; }
    .admin-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
    .subtitle { color: var(--text-secondary); margin: 0; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--accent, var(--accent-primary));
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .kpi-icon { font-size: 32px; }
    .kpi-value { font-size: 28px; font-weight: 700; }
    .kpi-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

    .section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .health-card, .verdict-card, .chart-card { background: var(--bg-secondary) !important; border: 1px solid var(--border-color) !important; border-radius: 12px !important; }
    .chart-card { margin-bottom: 24px; }

    .health-items { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .health-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .health-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .health-dot.green { background: #3fb950; }
    .health-dot.red { background: #f85149; }
    .health-dot.yellow { background: #d29922; }
    .health-status { margin-left: auto; font-size: 12px; text-transform: capitalize; color: var(--text-secondary); }
    .health-status.ok { color: #3fb950; }
    .health-value { margin-left: auto; font-weight: 600; }

    .quick-actions h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .actions-grid { display: flex; flex-wrap: wrap; gap: 12px; }

    @media (max-width: 768px) { .section-row { grid-template-columns: 1fr; } }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private adminApi = inject(AdminApiService);

  loading = signal(true);
  stats = signal<any>(null);
  kpis = signal<any[]>([]);
  verdictChart = signal<any>({});
  submissionsChart = signal<any>({});

  ngOnInit() {
    this.adminApi.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.buildKpis(s);
        this.buildVerdictChart(s);
        this.buildSubmissionsChart(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildKpis(s: any) {
    this.kpis.set([
      { icon: '👥', label: 'Total Users', value: s.totals.users, color: '#58a6ff' },
      { icon: '📝', label: 'Problems', value: s.totals.problems, color: '#3fb950' },
      { icon: '📨', label: 'Submissions', value: s.totals.submissions, color: '#d2a8ff' },
      { icon: '🏆', label: 'Contests', value: s.totals.contests, color: '#f2cc60' },
      { icon: '⚡', label: 'Today\'s Subs', value: s.recent.submissionsToday, color: '#ff7b72' },
    ]);
  }

  private buildVerdictChart(s: any) {
    const verdicts = s.verdictDistribution || [];
    const COLORS: Record<string, string> = {
      ACCEPTED: '#3fb950', WRONG_ANSWER: '#f85149', TIME_LIMIT_EXCEEDED: '#d29922',
      COMPILATION_ERROR: '#ff7b72', RUNTIME_ERROR: '#d2a8ff', MEMORY_LIMIT_EXCEEDED: '#79c0ff',
    };
    this.verdictChart.set({
      series: verdicts.map((v: any) => v.count),
      labels: verdicts.map((v: any) => v.verdict.replace(/_/g, ' ')),
      colors: verdicts.map((v: any) => COLORS[v.verdict] || '#8b949e'),
      chart: { type: 'donut', height: 260, background: 'transparent' },
      legend: { position: 'bottom', labels: { colors: '#8b949e' } },
      theme: { mode: 'dark' },
    });
  }

  private buildSubmissionsChart(s: any) {
    const daily = s.dailySubmissions || [];
    this.submissionsChart.set({
      series: [{ name: 'Submissions', data: daily.map((d: any) => d.count) }],
      chart: { type: 'area', height: 280, background: 'transparent', toolbar: { show: false } },
      xaxis: { categories: daily.map((d: any) => d.date), labels: { style: { colors: '#8b949e' }, rotate: -45 } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      colors: ['#58a6ff'],
      theme: { mode: 'dark' },
      grid: { borderColor: '#30363d' },
      tooltip: { theme: 'dark' },
    });
  }
}
