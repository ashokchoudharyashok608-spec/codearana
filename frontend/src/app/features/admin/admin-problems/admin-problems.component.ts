import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminApiService, ProblemsApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-problems',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>📝 Problem Management</h1>
        <a mat-raised-button color="primary" routerLink="/problems/new">
          <mat-icon>add</mat-icon> New Problem
        </a>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner /></div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="problems()" class="data-table">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Problem</th>
              <td mat-cell *matCellDef="let p">
                <div class="problem-cell">
                  <a [routerLink]="['/problems', p.slug]" class="problem-title">{{ p.title }}</a>
                  <div class="problem-meta">
                    <span class="diff-badge" [class]="p.difficulty.toLowerCase()">{{ p.difficulty }}</span>
                    @for (tag of p.tags.slice(0, 3); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                    @if (p.tags.length > 3) { <span class="tag">+{{ p.tags.length - 3 }}</span> }
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="setter">
              <th mat-header-cell *matHeaderCellDef>Setter</th>
              <td mat-cell *matCellDef="let p">{{ p.setter?.username || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="stats">
              <th mat-header-cell *matHeaderCellDef>Submissions</th>
              <td mat-cell *matCellDef="let p">
                <span class="stat-cell">
                  {{ p.submissionCount | number }} total /
                  <span class="ac-count">{{ p.acceptedCount | number }} AC</span>
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="testcases">
              <th mat-header-cell *matHeaderCellDef>Test Cases</th>
              <td mat-cell *matCellDef="let p">{{ p._count?.testCases || 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="published">
              <th mat-header-cell *matHeaderCellDef>Published</th>
              <td mat-cell *matCellDef="let p">
                <mat-slide-toggle
                  [checked]="p.isPublished"
                  (change)="togglePublish(p, $event.checked)"
                  color="primary"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button [routerLink]="['/problems', p.slug]" matTooltip="View">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteProblem(p)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
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
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .table-container { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; }
    .data-table { width: 100%; background: var(--bg-secondary); }
    .problem-cell { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
    .problem-title { font-weight: 600; color: var(--accent-primary); text-decoration: none; font-size: 14px; }
    .problem-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .diff-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .diff-badge.easy { background: rgba(63,185,80,.15); color: #3fb950; }
    .diff-badge.medium { background: rgba(210,168,86,.15); color: #d2a856; }
    .diff-badge.hard { background: rgba(248,81,73,.15); color: #f85149; }
    .tag { background: var(--bg-tertiary); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .stat-cell { font-size: 13px; color: var(--text-secondary); }
    .ac-count { color: #3fb950; }
  `],
})
export class AdminProblemsComponent implements OnInit {
  private adminApi = inject(AdminApiService);
  private problemsApi = inject(ProblemsApiService);
  private snack = inject(MatSnackBar);

  columns = ['title', 'setter', 'stats', 'testcases', 'published', 'actions'];
  problems = signal<any[]>([]);
  total = signal(0);
  loading = signal(true);
  page = 1;
  pageSize = 50;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.getUsers({ page: this.page, limit: this.pageSize }).subscribe(); // keep for DI
    // Use direct HTTP to the admin problems endpoint
    const token = localStorage.getItem('access_token') || '';
    fetch(`/api/admin/problems?page=${this.page}&limit=${this.pageSize}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(res => {
      this.problems.set(res.data || []);
      this.total.set(res.meta?.total || 0);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }

  togglePublish(problem: any, published: boolean) {
    this.problemsApi.updateProblem(problem.id, { isPublished: published }).subscribe({
      next: () => {
        problem.isPublished = published;
        this.snack.open(`Problem ${published ? 'published' : 'unpublished'}`, 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Failed to update', 'Dismiss', { duration: 3000 }),
    });
  }

  deleteProblem(problem: any) {
    if (!confirm(`Delete "${problem.title}"? This cannot be undone.`)) return;
    this.problemsApi.deleteProblem(problem.id).subscribe({
      next: () => {
        this.problems.update(ps => ps.filter(p => p.id !== problem.id));
        this.snack.open('Problem deleted', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Failed to delete', 'Dismiss', { duration: 3000 }),
    });
  }
}
