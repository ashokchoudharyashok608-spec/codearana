import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../../core/services/api.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule, MatSelectModule,
    MatInputModule, MatFormFieldModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>👥 User Management</h1>
        <div class="header-actions">
          <mat-form-field class="search-field">
            <mat-label>Search users</mat-label>
            <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)" placeholder="Email or username" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner /></div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="users()" class="users-table">
            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef>User</th>
              <td mat-cell *matCellDef="let user">
                <div class="user-cell">
                  <div class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
                  <div class="user-info">
                    <a [routerLink]="['/profile', user.username]" class="username">{{ user.username }}</a>
                    <span class="email">{{ user.email }}</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Role</th>
              <td mat-cell *matCellDef="let user">
                <mat-select [value]="user.role" (selectionChange)="changeRole(user.id, $event.value)" class="role-select">
                  <mat-option value="USER">USER</mat-option>
                  <mat-option value="SETTER">SETTER</mat-option>
                  <mat-option value="ADMIN">ADMIN</mat-option>
                </mat-select>
              </td>
            </ng-container>

            <ng-container matColumnDef="plan">
              <th mat-header-cell *matHeaderCellDef>Plan</th>
              <td mat-cell *matCellDef="let user">
                <span class="plan-badge" [class]="user.subscription?.plan?.toLowerCase()">
                  {{ user.subscription?.plan || 'FREE' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="stats">
              <th mat-header-cell *matHeaderCellDef>Stats</th>
              <td mat-cell *matCellDef="let user">
                <span class="stat-pill">⭐ {{ user.rating }}</span>
                <span class="stat-pill">✅ {{ user.totalSolved }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="verified">
              <th mat-header-cell *matHeaderCellDef>Verified</th>
              <td mat-cell *matCellDef="let user">
                <mat-icon [class]="user.isEmailVerified ? 'verified-icon' : 'unverified-icon'">
                  {{ user.isEmailVerified ? 'verified' : 'cancel' }}
                </mat-icon>
              </td>
            </ng-container>

            <ng-container matColumnDef="joined">
              <th mat-header-cell *matHeaderCellDef>Joined</th>
              <td mat-cell *matCellDef="let user">{{ user.createdAt | date:'MMM d, y' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize"
          [pageSizeOptions]="[20, 50, 100]"
          (page)="onPage($event)"
        />
      }
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .search-field { width: 280px; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }

    .table-container { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; }
    .users-table { width: 100%; background: var(--bg-secondary); }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .user-info { display: flex; flex-direction: column; }
    .username { font-weight: 600; text-decoration: none; color: var(--accent-primary); font-size: 14px; }
    .email { font-size: 12px; color: var(--text-secondary); }

    .role-select { font-size: 13px; }
    .plan-badge {
      padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .plan-badge.free { background: rgba(139,148,158,.15); color: #8b949e; }
    .plan-badge.pro { background: rgba(88,166,255,.15); color: #58a6ff; }
    .plan-badge.elite { background: rgba(210,168,255,.15); color: #d2a8ff; }

    .stat-pill { font-size: 12px; color: var(--text-secondary); margin-right: 8px; }
    .verified-icon { color: #3fb950; font-size: 20px; }
    .unverified-icon { color: #f85149; font-size: 20px; }
  `],
})
export class AdminUsersComponent implements OnInit {
  private adminApi = inject(AdminApiService);
  private snack = inject(MatSnackBar);
  private search$ = new Subject<string>();

  columns = ['user', 'role', 'plan', 'stats', 'verified', 'joined'];
  users = signal<any[]>([]);
  total = signal(0);
  loading = signal(true);
  searchQuery = '';
  page = 1;
  pageSize = 50;

  ngOnInit() {
    this.load();
    this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.adminApi.getUsers({ page: this.page, limit: this.pageSize, search: this.searchQuery || undefined }).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(q: string) { this.search$.next(q); }

  onPage(e: PageEvent) {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }

  changeRole(userId: string, role: string) {
    this.adminApi.updateUserRole(userId, role).subscribe({
      next: () => this.snack.open(`Role updated to ${role}`, 'OK', { duration: 3000 }),
      error: () => this.snack.open('Failed to update role', 'Dismiss', { duration: 3000 }),
    });
  }
}
