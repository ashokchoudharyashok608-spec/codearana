import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const problemsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./problems-list/problems-list.component').then(m => m.ProblemsListComponent),
    title: 'Problems - CodeArena',
  },
  {
    path: 'new',
    loadComponent: () => import('./problem-editor/problem-editor.component').then(m => m.ProblemEditorComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'SETTER'] },
    title: 'New Problem - CodeArena',
  },
  {
    path: ':slug',
    loadComponent: () => import('./problem-detail/problem-detail.component').then(m => m.ProblemDetailComponent),
    title: 'Problem - CodeArena',
  },
];
