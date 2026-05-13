import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
    title: 'CodeArena - Competitive Programming Platform',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes),
    title: 'CodeArena - Auth',
  },
  {
    path: 'problems',
    loadChildren: () => import('./features/problems/problems.routes').then(m => m.problemsRoutes),
    title: 'CodeArena - Problems',
  },
  {
    path: 'contests',
    loadChildren: () => import('./features/contests/contests.routes').then(m => m.contestsRoutes),
    title: 'CodeArena - Contests',
  },
  {
    path: 'profile/:username',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    title: 'CodeArena - Profile',
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
    title: 'CodeArena - Leaderboard',
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent),
    title: 'CodeArena - Pricing',
  },
  {
    path: 'submissions',
    loadComponent: () => import('./features/submissions/submissions-page.component').then(m => m.SubmissionsPageComponent),
    canActivate: [authGuard],
    title: 'My Submissions - CodeArena',
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    title: 'CodeArena - Admin',
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
