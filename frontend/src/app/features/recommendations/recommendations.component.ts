import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RecommendationApi } from '../../core/api/recommendation-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Recommendation } from '../../core/models/recommendation.model';

type StrategyKey = 'genre' | 'collaborative' | 'following';

interface Strategy {
  key: StrategyKey;
  label: string;
  emoji: string;
  description: string;
}

/**
 * Dashboard de recommandations : 3 stratégies en sections horizontales.
 * (similarTo est utilisé dans la fiche film, pas ici.)
 */
@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-10">
      <header>
        <h1 class="text-2xl font-semibold">Recommandations</h1>
        <p class="text-sm text-zinc-400 mt-1">
          Inspirées par tes notes, par les comptes que tu suis et par les
          utilisateurs qui ont des goûts proches du tien.
        </p>
      </header>

      @for (s of strategies; track s.key) {
        <section>
          <header class="flex items-baseline gap-2 mb-3">
            <h2 class="text-lg font-medium text-zinc-200">
              <span class="mr-1.5">{{ s.emoji }}</span>{{ s.label }}
            </h2>
            <span class="text-xs text-zinc-500">{{ s.description }}</span>
          </header>

          @if (loading().has(s.key)) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (_ of [1,2,3]; track $index) {
                <div class="card animate-pulse !p-4">
                  <div class="h-4 bg-ink-700 rounded w-1/2 mb-2"></div>
                  <div class="h-3 bg-ink-700 rounded w-3/4"></div>
                </div>
              }
            </div>
          } @else if (data()[s.key].length === 0) {
            <p class="text-sm text-zinc-500 italic">
              Pas encore de reco — note quelques films pour alimenter le moteur.
            </p>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (r of data()[s.key]; track r.movieId) {
                <a [routerLink]="['/movies', r.movieId]"
                   class="card hover:border-accent-500 transition-colors block !p-4">
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <h3 class="font-medium text-zinc-100 leading-tight">
                      {{ r.title }}
                    </h3>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-accent-500/10
                                 text-accent-400 border border-accent-500/30 whitespace-nowrap">
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
                </a>
              }
            </div>
          }
        </section>
      }
    </div>
  `
})
export class RecommendationsComponent {
  private api = inject(RecommendationApi);
  private auth = inject(AuthService);

  protected readonly strategies: Strategy[] = [
    {
      key: 'genre',
      label: 'Selon tes genres préférés',
      emoji: '🎯',
      description: 'films des genres que tu notes le plus haut'
    },
    {
      key: 'collaborative',
      label: 'Ils ont les mêmes goûts',
      emoji: '🤝',
      description: 'aimés par les utilisateurs qui notent comme toi'
    },
    {
      key: 'following',
      label: 'Aimés par les comptes que tu suis',
      emoji: '👥',
      description: 'ce que ton réseau a noté ≥ 4'
    }
  ];

  protected loading = signal<Set<StrategyKey>>(new Set(['genre', 'collaborative', 'following']));
  protected data = signal<Record<StrategyKey, Recommendation[]>>({
    genre: [],
    collaborative: [],
    following: []
  });

  constructor() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    this.fetch('genre',         this.api.byGenre(userId));
    this.fetch('collaborative', this.api.collaborative(userId));
    this.fetch('following',     this.api.fromFollowing(userId));
  }

  private fetch(key: StrategyKey, obs: ReturnType<typeof this.api.byGenre>) {
    obs.pipe(catchError(() => of([] as Recommendation[]))).subscribe(recos => {
      this.data.update(d => ({ ...d, [key]: recos }));
      this.loading.update(s => { const next = new Set(s); next.delete(key); return next; });
    });
  }
}
