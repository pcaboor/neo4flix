import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RecommendationApi } from '../../core/api/recommendation-api.service';
import { ShareApi, ShareStrategy } from '../../core/api/share-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/toast/toast.service';
import { Recommendation } from '../../core/models/recommendation.model';

type StrategyKey = 'genre' | 'collaborative' | 'following';

interface Strategy {
  key: StrategyKey;
  /** Stratégie côté API share (slug différent pour des raisons historiques d'URL). */
  shareStrategy: ShareStrategy;
  label: string;
  emoji: string;
  description: string;
}

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
          <header class="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
            <div class="flex items-baseline gap-2">
              <h2 class="text-lg font-medium text-zinc-200">
                <span class="mr-1.5">{{ s.emoji }}</span>{{ s.label }}
              </h2>
              <span class="text-xs text-zinc-500">{{ s.description }}</span>
            </div>
            @if (data()[s.key].length > 0) {
              <button (click)="share(s)"
                      [disabled]="sharing() === s.key"
                      class="text-xs text-zinc-400 hover:text-accent-400 inline-flex items-center gap-1 transition-colors">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                {{ sharing() === s.key ? 'Création…' : 'Partager' }}
              </button>
            }
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
  private shareApi = inject(ShareApi);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected readonly strategies: Strategy[] = [
    {
      key: 'genre',
      shareStrategy: 'by-genre',
      label: 'Selon tes genres préférés',
      emoji: '🎯',
      description: 'films des genres que tu notes le plus haut'
    },
    {
      key: 'collaborative',
      shareStrategy: 'collaborative',
      label: 'Ils ont les mêmes goûts',
      emoji: '🤝',
      description: 'aimés par les utilisateurs qui notent comme toi'
    },
    {
      key: 'following',
      shareStrategy: 'from-following',
      label: 'Aimés par les comptes que tu suis',
      emoji: '👥',
      description: 'ce que ton réseau a noté ≥ 4'
    }
  ];

  protected loading = signal<Set<StrategyKey>>(new Set(['genre', 'collaborative', 'following']));
  protected sharing = signal<StrategyKey | null>(null);
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

  protected share(s: Strategy) {
    this.sharing.set(s.key);
    this.shareApi.create(s.shareStrategy).subscribe({
      next: created => {
        const fullUrl = `${window.location.origin}${created.url}`;
        navigator.clipboard.writeText(fullUrl).then(
          () => this.toast.success('Lien copié dans le presse-papier'),
          () => this.toast.info(`Lien : ${fullUrl}`)
        );
        this.sharing.set(null);
      },
      error: () => {
        this.toast.error('Impossible de créer le partage');
        this.sharing.set(null);
      }
    });
  }

  private fetch(key: StrategyKey, obs: ReturnType<typeof this.api.byGenre>) {
    obs.pipe(catchError(() => of([] as Recommendation[]))).subscribe(recos => {
      this.data.update(d => ({ ...d, [key]: recos }));
      this.loading.update(s => { const next = new Set(s); next.delete(key); return next; });
    });
  }
}
