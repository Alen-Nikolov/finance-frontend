import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'notes', loadComponent: () => import('./pages/notes/notes').then(m => m.Notes) },
  { path: 'calculator', loadComponent: () => import('./pages/calculator/calculator').then(m => m.Calculator) },
  { path: 'budget', loadComponent: () => import('./pages/budget/budget').then(m => m.Budget) },
  { path: '**', redirectTo: '' }
];
