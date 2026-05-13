import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  constructor() {
    effect(() => {
      const t = this.theme();
      localStorage.setItem('theme', t);
      document.documentElement.setAttribute('data-theme', t);
      document.body.className = `theme-${t}`;
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
