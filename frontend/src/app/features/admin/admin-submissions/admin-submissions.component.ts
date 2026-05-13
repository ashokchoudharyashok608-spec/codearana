import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-submissions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>📊 Submission Monitor</h1>
        <div class="filters">
          <mat-form-field>
            <mat-label>Verdict</mat-label>
            <mat-select [(ngModel)]="verdictFilter" (ngModelChange)="onFilter()">
              <mat-option value="">All</mat-option>
              <mat-option value="ACCEPTED">Accepted</mat-option>
              <mat-option value="WRONG_ANSWER">Wrong Answer</mat-option>
              <mat-option value="TIME_LIMIT_EXCEEDED">TLE</mat-option>
              <mat-option value="COMPILATION_ERROR">CE</mat-option>
              <mat-option value="RUNTIME_ERROR">RE</mat-option>
              <mat-option value="PENDING">Pending</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner /></div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="submissions()" class="data-table">

            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let s">
                <span class="mono text-muted">{{ s.id.slice(0, 8) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef>User</th>
              <td mat-cell *matCellDef="let s">
                <a [routerLink]="['/profile', s.user?.username]" class="link">{{ s.user?.username }}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="problem">
              <th mat-header-cell *matHeaderCellDef>Problem</th>
              <td mat-cell *matCellDef="let s">
                <a [routerLink]="['/problems', s.problem?.slug]" class="link">{{ s.problem?.title }}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="language">
              <th mat-header-cell *matHeaderCellDef>Lang</th>
              <td mat-cell *matCellDef="let s">
                <span class="lang-badge">{{ s.language }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="verdict">
              <th mat-header-cell *matHeaderCellDef>Verdict</th>
              <td mat-cell *matCellDef="let s">
                <span class="verdict-badge" [class]="verdictClass(s.verdict)">{{ verdictLabel(s.verdict) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let s">
                {{ s.executionTime ? s.executionTime + 'ms' : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="tests">
              <th mat-header-cell *matHeaderCellDef>Tests</th>
              <td mat-cell *matCellDef="let s">
                {{ s.testsPassed }}/{{ s.testsTotal }}
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>When</th>
              <td mat-cell *matCellDef="let s">{{ s.createdAt | date:'MMM d, HH:mm' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let s">
                <button mat-icon-button (click)="rejudge(s)" matTooltip="Rejudge" color="primary">
                  <mat-icon>refresh</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize"
          [pageSizeOptions]="[25, 50, 100]"
          (page)="onPage($event)"
        />
      }
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .filters { display: flex; gap: 12px; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .table-container { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; }
    .data-table { width: 100%; background: var(--bg-secondary); }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .text-muted { color: var(--text-secondary); }
    .link { color: var(--accent-primary); text-decoration: none; }
    .lang-badge { background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }
    .verdict-badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .verdict-badge.ac { background: rgba(63,185,80,.15); color: #3fb950; }
    .verdict-badge.wa { background: rgba(248,81,73,.15); color: #f85149; }
    .verdict-badge.tle { background: rgba(210,168,86,.15); color: #d2a856; }
    .verdict-badge.ce { background: rgba(255,123,114,.15); color: #ff7b72; }
    .verdict-badge.re { background: rgba(210,168,255,.15); color: #d2a8ff; }
    .verdict-badge.pending { background: rgba(139,148,158,.15); color: #8b949e; }
  `],
})
export class AdminSubmissionsComponent implements OnInit {
  private adminApi = inject(AdminApiService);
  private snack = inject(MatSnackBar);

  columns = ['id', 'user', 'problem', 'language', 'verdict', 'time', 'tests', 'createdAt', 'actions'];
  submissions = signal<any[]>([]);
  total = signal(0);
  loading = signal(true);
  verdictFilter = '';
  page = 1;
  pageSize = 50;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.getSubmissions({
      page: this.page,
      limit: this.pageSize,
      verdict: this.verdictFilter || undefined,
    }).subscribe({
      next: (res) => {
        this.submissions.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilter() { this.page = 1; this.load(); }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }

  rejudge(sub: any) {
    this.adminApi.rejudge(sub.id).subscribe({
      next: () => this.snack.open('Submission queued for rejudging', 'OK', { duration: 3000 }),
      error: () => this.snack.open('Rejudge failed', 'Dismiss', { duration: 3000 }),
    });
  }

  verdictClass(v: string): string {
    const m: Record<string, string> = {
      ACCEPTED: 'ac', WRONG_ANSWER: 'wa', TIME_LIMIT_EXCEEDED: 'tle',
      COMPILATION_ERROR: 'ce', RUNTIME_ERROR: 're', PENDING: 'pending',
    };
    return m[v] || 'pending';
  }

  verdictLabel(v: string): string {
    const m: Record<string, string> = {
      ACCEPTED: 'AC', WRONG_ANSWER: 'WA', TIME_LIMIT_EXCEEDED: 'TLE',
      MEMORY_LIMIT_EXCEEDED: 'MLE', COMPILATION_ERROR: 'CE', RUNTIME_ERROR: 'RE', PENDING: '...',
    };
    return m[v] || v;
  }
}
