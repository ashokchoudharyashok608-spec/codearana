import { Routes } from '@angular/router';

export const contestsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./contests-list/contests-list.component').then(m => m.ContestsListComponent),
    title: 'Contests - CodeArena',
  },
  {
    path: ':slug',
    loadComponent: () => import('./contest-detail/contest-detail.component').then(m => m.ContestDetailComponent),
    title: 'Contest - CodeArena',
  },
];
