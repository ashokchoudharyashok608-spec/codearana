import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    title: 'CodeArena - Admin Dashboard',
  },
  {
    path: 'users',
    loadComponent: () => import('./admin-users/admin-users.component').then(m => m.AdminUsersComponent),
    title: 'CodeArena - Manage Users',
  },
  {
    path: 'problems',
    loadComponent: () => import('./admin-problems/admin-problems.component').then(m => m.AdminProblemsComponent),
    title: 'CodeArena - Manage Problems',
  },
  {
    path: 'submissions',
    loadComponent: () => import('./admin-submissions/admin-submissions.component').then(m => m.AdminSubmissionsComponent),
    title: 'CodeArena - Monitor Submissions',
  },
];
