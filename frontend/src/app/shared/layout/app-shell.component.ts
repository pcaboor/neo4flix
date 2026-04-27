import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastHostComponent } from '../components/toast-host.component';

/**
 * Layout des routes authentifiées : navbar + contenu + toast host global.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastHostComponent],
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="border-b border-ink-700 bg-ink-800/80 backdrop-blur sticky top-0 z-10">
        <nav class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div class="flex items-center gap-8">
            <a routerLink="/" class="flex items-center gap-2 group">
              <span class="w-7 h-7 rounded-md bg-accent-500 grid place-content-center font-bold text-white text-sm">N4</span>
              <span class="font-semibold text-zinc-100 group-hover:text-white">Neo4flix</span>
            </a>
            <div class="hidden sm:flex items-center gap-1 text-sm">
              <a routerLink="/movies" routerLinkActive="bg-ink-700 text-white"
                 class="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors">
                Catalogue
              </a>
              <a routerLink="/recommendations" routerLinkActive="bg-ink-700 text-white"
                 class="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors">
                Reco
              </a>
              <a routerLink="/watchlist" routerLinkActive="bg-ink-700 text-white"
                 class="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors">
                Watchlist
              </a>
              <a routerLink="/users" routerLinkActive="bg-ink-700 text-white"
                 class="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors">
                Communauté
              </a>
            </div>
          </div>

          <div class="flex items-center gap-3 text-sm">
            <a routerLink="/profile" routerLinkActive="text-white"
               class="text-zinc-400 hover:text-zinc-100 transition-colors">
              {{ auth.currentUser()?.username }}
            </a>
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
    <app-toast-host />
  `
})
export class AppShellComponent {
  protected auth = inject(AuthService);
}
