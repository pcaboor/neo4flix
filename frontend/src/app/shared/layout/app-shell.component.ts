import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Layout des routes authentifiées : navbar + contenu (router-outlet enfant).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="border-b border-ink-700 bg-ink-800/80 backdrop-blur sticky top-0 z-10">
        <nav class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a routerLink="/" class="flex items-center gap-2 group">
            <span class="w-7 h-7 rounded-md bg-accent-500 grid place-content-center font-bold text-white text-sm">N4</span>
            <span class="font-semibold text-zinc-100 group-hover:text-white">Neo4flix</span>
          </a>
          <div class="flex items-center gap-4 text-sm">
            <span class="text-zinc-400">
              {{ auth.currentUser()?.username }}
            </span>
            <button (click)="auth.logout()" class="btn-ghost text-sm py-1 px-3">
              Déconnexion
            </button>
          </div>
        </nav>
      </header>
      <main class="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <router-outlet />
      </main>
    </div>
  `
})
export class AppShellComponent {
  protected auth = inject(AuthService);
}
