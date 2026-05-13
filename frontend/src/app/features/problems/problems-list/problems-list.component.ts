import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProblemsApiService, Problem } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-problems-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatTableModule, MatChipsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatPaginatorModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="problems-page">
      <div class="page-header">
        <div>
          <h1>Problems</h1>
          <p class="subtitle">{{ total() }} problems available</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <mat-form-field class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Search problems...</mat-label>
          <input matInput [formControl]="searchCtrl">
        </mat-form-field>

        <mat-form-field class="diff-filter">
          <mat-label>Difficulty</mat-label>
          <mat-select [formControl]="diffCtrl">
            <mat-option value="">All</mat-option>
            <mat-option value="EASY">Easy</mat-option>
            <mat-option value="MEDIUM">Medium</mat-option>
            <mat-option value="HARD">Hard</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Popular Tags -->
        <div class="tag-filters">
          @for (tag of popularTags; track tag) {
            <mat-chip-option
              [selected]="selectedTags().includes(tag)"
              (click)="toggleTag(tag)">
              {{ tag }}
            </mat-chip-option>
          }
        </div>
      </div>

      <!-- Table -->
      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="48"></mat-spinner></div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="problems()" class="problems-table">
            <!-- Status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="status-col"></th>
              <td mat-cell *matCellDef="let p">
                @if (p.isSolved) {
                  <mat-icon class="solved-icon" matTooltip="Solved">check_circle</mat-icon>
                } @else if (auth.isAuthenticated()) {
                  <mat-icon class="unsolved-icon">radio_button_unchecked</mat-icon>
                }
              </td>
            </ng-container>

            <!-- Title -->
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let p">
                <a [routerLink]="['/problems', p.slug]" class="problem-link">{{ p.title }}</a>
                <div class="tag-row">
                  @for (tag of p.tags.slice(0, 3); track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                  @if (p.tags.length > 3) {
                    <span class="tag tag-more">+{{ p.tags.length - 3 }}</span>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Difficulty -->
            <ng-container matColumnDef="difficulty">
              <th mat-header-cell *matHeaderCellDef>Difficulty</th>
              <td mat-cell *matCellDef="let p">
                <span class="diff-badge" [class]="p.difficulty.toLowerCase()">
                  {{ p.difficulty }}
                </span>
              </td>
            </ng-container>

            <!-- Acceptance -->
            <ng-container matColumnDef="acceptance">
              <th mat-header-cell *matHeaderCellDef>Acceptance</th>
              <td mat-cell *matCellDef="let p">
                <div class="acceptance-cell">
                  <div class="acceptance-bar-bg">
                    <div class="acceptance-bar" [style.width.%]="p.acceptanceRate"></div>
                  </div>
                  <span class="acceptance-pct">{{ p.acceptanceRate }}%</span>
                </div>
              </td>
            </ng-container>

            <!-- Submissions -->
            <ng-container matColumnDef="submissions">
              <th mat-header-cell *matHeaderCellDef>Submissions</th>
              <td mat-cell *matCellDef="let p" class="mono">{{ p.submissionCount | number }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="problem-row"></tr>
          </table>

          <mat-paginator
            [length]="total()"
            [pageSize]="pageSize"
            [pageSizeOptions]="[20, 50, 100]"
            (page)="onPage($event)"
            aria-label="Problems pagination">
          </mat-paginator>
        </div>
      }
    </div>
  `,
  styles: [`
    .problems-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; margin: 0; }
    .filters-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .search-field { flex: 1; min-width: 240px; }
    .diff-filter { width: 160px; }
    .tag-filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .table-container { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
    .problems-table { width: 100%; }
    .status-col { width: 48px; }
    .solved-icon { color: #3fb950; font-size: 18px; width: 18px; height: 18px; }
    .unsolved-icon { color: var(--border-color); font-size: 18px; width: 18px; height: 18px; }
    .problem-link { color: var(--text-primary); text-decoration: none; font-weight: 500; font-size: 15px; }
    .problem-link:hover { color: var(--accent-primary); }
    .tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .tag { font-size: 11px; padding: 2px 8px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-secondary); }
    .tag-more { color: var(--accent-primary); background: transparent; }
    .diff-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 4px; }
    .diff-badge.easy { background: rgba(63,185,80,.15); color: #3fb950; }
    .diff-badge.medium { background: rgba(210,167,7,.15); color: #d2a707; }
    .diff-badge.hard { background: rgba(248,81,73,.15); color: #f85149; }
    .acceptance-cell { display: flex; align-items: center; gap: 10px; }
    .acceptance-bar-bg { flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; min-width: 60px; }
    .acceptance-bar { height: 100%; background: var(--accent-primary); border-radius: 3px; transition: width .3s; }
    .acceptance-pct { font-size: 13px; color: var(--text-secondary); min-width: 36px; }
    .mono { font-family: monospace; font-size: 13px; }
    .problem-row:hover { background: var(--bg-tertiary); }
    ::ng-deep .mat-mdc-row { cursor: pointer; }
  `],
})
export class ProblemsListComponent implements OnInit {
  private api = inject(ProblemsApiService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  displayedColumns = ['status', 'title', 'difficulty', 'acceptance', 'submissions'];
  popularTags = ['array', 'dynamic-programming', 'graph', 'binary-search', 'string', 'tree', 'two-pointers', 'greedy'];

  problems = signal<Problem[]>([]);
  total = signal(0);
  loading = signal(false);
  selectedTags = signal<string[]>([]);

  page = 1;
  pageSize = 20;

  searchCtrl = this.fb.control('');
  diffCtrl = this.fb.control('');

  ngOnInit() {
    this.load();

    this.searchCtrl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.load();
    });

    this.diffCtrl.valueChanges.subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.api.getProblems({
      page: this.page,
      limit: this.pageSize,
      difficulty: this.diffCtrl.value || undefined,
      search: this.searchCtrl.value || undefined,
      tags: this.selectedTags().join(',') || undefined,
    }).subscribe({
      next: (res) => {
        this.problems.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleTag(tag: string) {
    this.selectedTags.update(tags =>
      tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
    );
    this.page = 1;
    this.load();
  }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }
}
