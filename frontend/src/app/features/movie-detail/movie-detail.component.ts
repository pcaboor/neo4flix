import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MovieApi } from '../../core/api/movie-api.service';
import { RatingApi } from '../../core/api/rating-api.service';
import { UserApi } from '../../core/api/user-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Movie } from '../../core/models/movie.model';
import { MovieRatingStats, Rating } from '../../core/models/rating.model';
import { StarRatingComponent } from '../../shared/components/star-rating.component';

/**
 * Fiche détaillée d'un film.
 * Compose plusieurs services API : Movie + Rating + User (watchlist).
 */
@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [RouterLink, StarRatingComponent],
  template: `
    @if (movie(); as m) {
      <div class="space-y-8">
        <a routerLink="/movies" class="text-sm text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1">
          ← Retour au catalogue
        </a>

        <div class="grid md:grid-cols-[280px_1fr] gap-8">
          <!-- Poster -->
          <div class="aspect-[2/3] rounded-lg bg-gradient-to-br from-ink-700 to-ink-600 overflow-hidden grid place-items-center">
            @if (m.posterUrl) {
              <img [src]="m.posterUrl" [alt]="m.title" class="w-full h-full object-cover" />
            } @else {
              <span class="text-7xl text-ink-500 font-mono">{{ initials() }}</span>
            }
          </div>

          <!-- Infos -->
          <div class="space-y-5">
            <div>
              <h1 class="text-3xl font-semibold">{{ m.title }}</h1>
              <p class="text-zinc-400 mt-1">
                {{ m.releaseYear }}
                @if (m.duration) {
                  · {{ m.duration }} min
                }
                @if (m.directors.length) {
                  · réalisé par {{ m.directors.join(', ') }}
                }
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              @for (g of m.genres; track g) {
                <span class="text-xs px-2.5 py-1 rounded-full bg-ink-700 text-zinc-300 border border-ink-500">
                  {{ g }}
                </span>
              }
            </div>

            @if (m.description) {
              <p class="text-zinc-300 leading-relaxed">{{ m.description }}</p>
            }

            <!-- Stats globales -->
            @if (stats(); as s) {
              @if (s.count > 0) {
                <div class="flex items-center gap-3 pt-3 border-t border-ink-700">
                  <app-star-rating [rating]="s.average" [readonly]="true" [size]="22" [showLabel]="true" />
                  <span class="text-sm text-zinc-500">
                    ({{ s.count }} note{{ s.count > 1 ? 's' : '' }})
                  </span>
                </div>
              } @else {
                <p class="text-sm text-zinc-500 pt-3 border-t border-ink-700">
                  Aucune note pour ce film. Sois le premier !
                </p>
              }
            }

            <!-- Action user -->
            <div class="card !p-4 space-y-4">
              <!-- Notation -->
              <div>
                <p class="text-sm text-zinc-300 mb-2">
                  @if (myRating()) {
                    Ta note :
                  } @else {
                    Note ce film :
                  }
                </p>
                <app-star-rating
                  [rating]="myRating()?.score ?? 0"
                  [size]="28"
                  (rated)="rate($event)" />
              </div>

              <!-- Watchlist -->
              <div class="flex items-center justify-between pt-3 border-t border-ink-700">
                <span class="text-sm text-zinc-300">Watchlist</span>
                @if (inWatchlist()) {
                  <button (click)="toggleWatchlist()" class="btn-ghost" [disabled]="busy()">
                    Retirer
                  </button>
                } @else {
                  <button (click)="toggleWatchlist()" class="btn-primary" [disabled]="busy()">
                    Ajouter
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        @if (recentRatings().length) {
          <section>
            <h2 class="text-lg font-medium text-zinc-300 mb-3">Notes récentes</h2>
            <div class="space-y-2">
              @for (r of recentRatings(); track r.userId + r.ratedAt) {
                <div class="card !py-3 !px-4 flex items-center justify-between">
                  <span class="text-sm text-zinc-300">{{ r.username }}</span>
                  <app-star-rating [rating]="r.score" [readonly]="true" [size]="16" />
                </div>
              }
            </div>
          </section>
        }
      </div>
    } @else if (loading()) {
      <p class="text-zinc-500">Chargement…</p>
    } @else {
      <p class="text-accent-400">Film introuvable.</p>
    }
  `
})
export class MovieDetailComponent implements OnInit {
  private movieApi = inject(MovieApi);
  private ratingApi = inject(RatingApi);
  private userApi = inject(UserApi);
  private auth = inject(AuthService);

  // Provided by router withComponentInputBinding (path :id → input id)
  id = input.required<string>();

  protected movie = signal<Movie | null>(null);
  protected stats = signal<MovieRatingStats | null>(null);
  protected myRating = signal<Rating | null>(null);
  protected recentRatings = signal<Rating[]>([]);
  protected inWatchlist = signal(false);
  protected loading = signal(true);
  protected busy = signal(false);

  ngOnInit() {
    this.loadAll();
  }

  protected initials() {
    return (this.movie()?.title ?? '')
      .split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  rate(score: number) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.busy.set(true);
    this.ratingApi.rate(userId, this.id(), score).subscribe({
      next: r => {
        this.myRating.set(r);
        this.busy.set(false);
        this.refreshStats();
      },
      error: () => this.busy.set(false)
    });
  }

  toggleWatchlist() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.busy.set(true);
    const op = this.inWatchlist()
      ? this.userApi.removeFromWatchlist(userId, this.id())
      : this.userApi.addToWatchlist(userId, this.id());
    op.subscribe({
      next: () => {
        this.inWatchlist.update(v => !v);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }

  private loadAll() {
    const userId = this.auth.currentUser()?.id ?? '';
    this.loading.set(true);

    forkJoin({
      movie: this.movieApi.get(this.id()).pipe(catchError(() => of(null))),
      stats: this.ratingApi.stats(this.id()).pipe(catchError(() => of(null))),
      ratings: this.ratingApi.byMovie(this.id()).pipe(catchError(() => of([] as Rating[]))),
      watchlist: this.userApi.watchlist(userId).pipe(catchError(() => of([])))
    }).subscribe(({ movie, stats, ratings, watchlist }) => {
      this.movie.set(movie);
      this.stats.set(stats);
      const mine = ratings.find(r => r.userId === userId) ?? null;
      this.myRating.set(mine);
      this.recentRatings.set(ratings.filter(r => r.userId !== userId).slice(0, 5));
      this.inWatchlist.set(watchlist.some(w => w.id === this.id()));
      this.loading.set(false);
    });
  }

  private refreshStats() {
    this.ratingApi.stats(this.id()).subscribe(s => this.stats.set(s));
  }
}
