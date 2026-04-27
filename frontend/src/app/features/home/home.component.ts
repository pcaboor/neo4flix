import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MovieApi } from '../../core/api/movie-api.service';
import { Movie } from '../../core/models/movie.model';

/**
 * Home temporaire — affiche un message + la liste des films pour vérifier
 * que le JWT auto-injecté par l'interceptor fonctionne.
 * Sera remplacée par le vrai catalogue à l'étape B.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="space-y-8">
      <section>
        <h1 class="text-3xl font-semibold">
          Hello, {{ auth.currentUser()?.username }} 👋
        </h1>
        <p class="text-zinc-400 mt-2">
          La connexion fonctionne — le token JWT est injecté automatiquement
          dans toutes les requêtes vers l'API.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-medium text-zinc-300 mb-3">
          Catalogue (test API)
        </h2>

        @if (loading()) {
          <p class="text-zinc-500 text-sm">Chargement…</p>
        }

        @if (error()) {
          <p class="text-accent-400 text-sm">{{ error() }}</p>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (m of movies(); track m.id) {
            <div class="card hover:border-ink-400 transition-colors">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="font-medium text-zinc-100">{{ m.title }}</h3>
                  <p class="text-xs text-zinc-500">{{ m.releaseYear }}</p>
                </div>
                @if (m.duration) {
                  <span class="text-xs text-zinc-400 whitespace-nowrap">{{ m.duration }} min</span>
                }
              </div>
              @if (m.description) {
                <p class="text-sm text-zinc-400 mt-3 line-clamp-2">{{ m.description }}</p>
              }
              <div class="flex flex-wrap gap-1.5 mt-3">
                @for (g of m.genres; track g) {
                  <span class="text-xs px-2 py-0.5 rounded-full bg-ink-700 text-zinc-300 border border-ink-500">
                    {{ g }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      </section>
    </div>
  `
})
export class HomeComponent {
  protected auth = inject(AuthService);
  private api = inject(MovieApi);

  protected movies = signal<Movie[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);

  constructor() {
    this.api.list().subscribe({
      next: ms => { this.movies.set(ms); this.loading.set(false); },
      error: e => { this.error.set(e.error?.message ?? 'Erreur'); this.loading.set(false); }
    });
  }
}
