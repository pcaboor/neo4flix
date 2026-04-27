import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShareApi, SharedRecommendations } from '../../core/api/share-api.service';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Page publique d'un partage. Pas de navbar / pas de guard d'auth.
 * Visible par n'importe qui ayant le lien.
 */
@Component({
  selector: 'app-share',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800">
      <!-- Header simplifié -->
      <header class="border-b border-ink-700 bg-ink-800/60 backdrop-blur">
        <nav class="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <a routerLink="/" class="flex items-center gap-2 group">
            <span class="w-7 h-7 rounded-md bg-accent-500 grid place-content-center font-bold text-white text-sm">N4</span>
            <span class="font-semibold text-zinc-100">Neo4flix</span>
          </a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/movies" class="btn-ghost text-sm py-1 px-3">Mon catalogue</a>
          } @else {
            <a routerLink="/login" class="btn-primary text-sm py-1 px-3">Se connecter</a>
          }
        </nav>
      </header>

      <main class="max-w-4xl mx-auto px-6 py-10">
        @if (loading()) {
          <p class="text-zinc-500">Chargement…</p>
        } @else if (error()) {
          <div class="card text-center py-12">
            <p class="text-accent-400 mb-2">Lien invalide ou expiré.</p>
            <a routerLink="/" class="text-sm text-accent-400 hover:underline">
              Retour à l'accueil
            </a>
          </div>
        } @else if (data()) {
          @let d = data()!;
          <header class="mb-8">
            <p class="text-xs uppercase tracking-wider text-zinc-500 mb-1">
              {{ strategyLabel(d.strategy) }}
            </p>
            <h1 class="text-3xl font-semibold">
              Recommandations de {{ d.ownerUsername }}
            </h1>
            <p class="text-sm text-zinc-400 mt-2">
              Partagé {{ formatDate(d.createdAt) }} · {{ d.items.length }} films
            </p>
          </header>

          @if (d.items.length === 0) {
            <p class="text-zinc-500 italic">Pas de films dans ce partage.</p>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (r of d.items; track r.movieId) {
                <div class="card !p-4">
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <h3 class="font-medium text-zinc-100 leading-tight">{{ r.title }}</h3>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/30 whitespace-nowrap">
                      ★ {{ r.score.toFixed(1) }}
                    </span>
                  </div>
                  <p class="text-xs text-zinc-500 mb-2">
                    {{ r.releaseYear }}
                    @if (r.genres.length) {
                      · {{ r.genres.slice(0, 3).join(', ') }}
                    }
                  </p>
                  @if (r.reason) {
                    <p class="text-xs text-zinc-400 italic">{{ r.reason }}</p>
                  }
                </div>
              }
            </div>
          }

          <div class="mt-10 text-center">
            @if (auth.isAuthenticated()) {
              <a routerLink="/recommendations" class="btn-ghost">
                Voir mes propres recommandations
              </a>
            } @else {
              <p class="text-sm text-zinc-400 mb-3">
                Crée un compte pour avoir tes propres recommandations
              </p>
              <a routerLink="/register" class="btn-primary">
                Créer un compte
              </a>
            }
          </div>
        }
      </main>
    </div>
  `
})
export class ShareComponent implements OnInit {
  private api = inject(ShareApi);
  protected auth = inject(AuthService);

  token = input.required<string>();

  protected data = signal<SharedRecommendations | null>(null);
  protected loading = signal(true);
  protected error = signal(false);

  ngOnInit() {
    this.api.get(this.token()).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }

  protected strategyLabel(s: string): string {
    switch (s) {
      case 'by-genre':       return '🎯 Genres préférés';
      case 'collaborative':  return '🤝 Goûts similaires';
      case 'from-following': return '👥 Réseau';
      default: return s;
    }
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    const days = Math.round((Date.now() - d.getTime()) / 86400_000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 30) return `il y a ${days} jours`;
    return `le ${d.toLocaleDateString('fr-FR')}`;
  }
}
