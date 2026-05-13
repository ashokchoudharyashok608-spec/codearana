import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SubmissionsApiService, Submission } from '../../core/services/api.service';

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatPaginatorModule, MatSelectModule,
    MatFormFieldModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <div class="submissions-page">
      <div class="page-header">
        <h1>My Submissions</h1>
        <div class="filters">
          <mat-form-field>
            <mat-label>Verdict</mat-label>
            <mat-select [(ngModel)]="verdictFilter" (ngModelChange)="load()">
              <mat-option value="">All</mat-option>
              <mat-option value="ACCEPTED">✅ Accepted</mat-option>
              <mat-option value="WRONG_ANSWER">❌ Wrong Answer</mat-option>
              <mat-option value="TIME_LIMIT_EXCEEDED">⏱ TLE</mat-option>
              <mat-option value="COMPILATION_ERROR">🔨 CE</mat-option>
              <mat-option value="RUNTIME_ERROR">💥 RE</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner /></div>
      } @else if (submissions().length === 0) {
        <div class="empty-state">
          <mat-icon>code_off</mat-icon>
          <h2>No submissions yet</h2>
          <p>Start solving problems to see your submissions here.</p>
          <a mat-raised-button color="primary" routerLink="/problems">Browse Problems</a>
        </div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="submissions()">

            <ng-container matColumnDef="problem">
              <th mat-header-cell *matHeaderCellDef>Problem</th>
              <td mat-cell *matCellDef="let s">
                <a [routerLink]="['/problems', s.problem?.slug]" class="problem-link">
                  {{ s.problem?.title }}
                </a>
                <span class="diff-badge" [class]="s.problem?.difficulty?.toLowerCase()">
                  {{ s.problem?.difficulty }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="verdict">
              <th mat-header-cell *matHeaderCellDef>Verdict</th>
              <td mat-cell *matCellDef="let s">
                <span class="verdict-pill" [class]="verdictClass(s.verdict)">
                  {{ verdictLabel(s.verdict) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="language">
              <th mat-header-cell *matHeaderCellDef>Language</th>
              <td mat-cell *matCellDef="let s">
                <span class="lang-tag">{{ langLabel(s.language) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let s">
                {{ s.executionTime ? s.executionTime + 'ms' : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="memory">
              <th mat-header-cell *matHeaderCellDef>Memory</th>
              <td mat-cell *matCellDef="let s">
                {{ s.memoryUsed ? (s.memoryUsed / 1024).toFixed(1) + ' MB' : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="tests">
              <th mat-header-cell *matHeaderCellDef>Tests</th>
              <td mat-cell *matCellDef="let s">
                <span [class.all-passed]="s.testsPassed === s.testsTotal && s.testsTotal > 0">
                  {{ s.testsPassed }}/{{ s.testsTotal }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="when">
              <th mat-header-cell *matHeaderCellDef>When</th>
              <td mat-cell *matCellDef="let s" class="time-cell">
                {{ s.createdAt | date:'MMM d, y HH:mm' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;" class="submission-row"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize"
          [pageSizeOptions]="[20, 50]"
          (page)="onPage($event)"
          class="paginator"
        />
      }
    </div>
  `,
  styles: [`
    .submissions-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
    .filters { display: flex; gap: 12px; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 80px 24px; text-align: center;
      border: 1px dashed var(--border-color); border-radius: 16px;
    }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--text-muted); }
    .empty-state h2 { font-size: 22px; margin: 0; }
    .empty-state p { color: var(--text-secondary); margin: 0; }

    .table-container { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; }
    table { width: 100%; background: var(--bg-secondary); }

    .problem-link { font-weight: 600; color: var(--accent-primary); text-decoration: none; margin-right: 8px; }
    .problem-link:hover { text-decoration: underline; }

    .diff-badge { padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .diff-badge.easy { background: rgba(63,185,80,.15); color: #3fb950; }
    .diff-badge.medium { background: rgba(210,168,86,.15); color: #d2a856; }
    .diff-badge.hard { background: rgba(248,81,73,.15); color: #f85149; }

    .verdict-pill { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .verdict-pill.ac { background: rgba(63,185,80,.15); color: #3fb950; }
    .verdict-pill.wa { background: rgba(248,81,73,.15); color: #f85149; }
    .verdict-pill.tle { background: rgba(210,168,86,.15); color: #d2a856; }
    .verdict-pill.ce { background: rgba(255,123,114,.15); color: #ff7b72; }
    .verdict-pill.re { background: rgba(210,168,255,.15); color: #d2a8ff; }
    .verdict-pill.mle { background: rgba(255,166,87,.15); color: #ffa657; }
    .verdict-pill.pending { background: rgba(139,148,158,.15); color: #8b949e; }

    .lang-tag { background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; }
    .all-passed { color: #3fb950; font-weight: 600; }
    .time-cell { color: var(--text-secondary); font-size: 13px; }
    .submission-row { cursor: default; }
    .paginator { background: transparent; margin-top: 16px; }
  `],
})
export class SubmissionsPageComponent implements OnInit {
  private api = inject(SubmissionsApiService);

  columns = ['problem', 'verdict', 'language', 'time', 'memory', 'tests', 'when'];
  submissions = signal<Submission[]>([]);
  total = signal(0);
  loading = signal(true);
  verdictFilter = '';
  page = 1;
  pageSize = 20;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getMySubmissions({
      page: this.page,
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

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }

  verdictClass(v: string): string {
    const m: Record<string, string> = {
      ACCEPTED: 'ac', WRONG_ANSWER: 'wa', TIME_LIMIT_EXCEEDED: 'tle',
      COMPILATION_ERROR: 'ce', RUNTIME_ERROR: 're', MEMORY_LIMIT_EXCEEDED: 'mle', PENDING: 'pending',
    };
    return m[v] || 'pending';
  }

  verdictLabel(v: string): string {
    const m: Record<string, string> = {
      ACCEPTED: 'Accepted', WRONG_ANSWER: 'Wrong Answer', TIME_LIMIT_EXCEEDED: 'Time Limit',
      MEMORY_LIMIT_EXCEEDED: 'Memory Limit', COMPILATION_ERROR: 'Compile Error',
      RUNTIME_ERROR: 'Runtime Error', PENDING: 'Pending',
    };
    return m[v] || v;
  }

  langLabel(l: string): string {
    const m: Record<string, string> = {
      CPP: 'C++', JAVA: 'Java', PYTHON3: 'Python 3',
      JAVASCRIPT: 'JavaScript', GO: 'Go', RUST: 'Rust',
    };
    return m[l] || l;
  }
}
