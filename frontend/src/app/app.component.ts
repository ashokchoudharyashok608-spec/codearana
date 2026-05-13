import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div [class]="'app-shell theme-' + themeService.theme()">
      <app-navbar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    .main-content {
      flex: 1;
    }
  `],
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.authService.initAuth();
  }
}
