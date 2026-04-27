import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { MovieApi } from '../../core/api/movie-api.service';
import { Movie } from '../../core/models/movie.model';
import { MovieCardComponent } from '../../shared/components/movie-card.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [ReactiveFormsModule, MovieCardComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold">Catalogue</h1>
          <p class="text-sm text-zinc-400 mt-1">
            {{ movies().length }} film{{ movies().length > 1 ? 's' : '' }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative">
            <input [formControl]="searchControl"
                   placeholder="Rechercher un titre…"
                   class="input pl-9 sm:w-64" />
            <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </div>

          <select [formControl]="genreControl" class="input sm:w-44">
            <option [ngValue]="''">Tous les genres</option>
            @for (g of genres; track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>
      </header>

      @if (loading()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          @for (_ of [1,2,3,4,5,6,7,8]; track $index) {
            <div class="card animate-pulse">
              <div class="aspect-[2/3] rounded-md bg-ink-700 mb-3"></div>
              <div class="h-4 bg-ink-700 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-ink-700 rounded w-1/2"></div>
            </div>
          }
        </div>
      } @else if (movies().length === 0) {
        <div class="card text-center text-zinc-400 py-12">
          Aucun film ne correspond à ta recherche.
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          @for (m of movies(); track m.id) {
            <app-movie-card [movie]="m" />
          }
        </div>
      }
    </div>
  `
})
export class CatalogComponent implements OnDestroy {
  private api = inject(MovieApi);
  private destroy$ = new Subject<void>();

  // Liste de genres extraite du seed — pourrait venir d'un endpoint dédié
  protected readonly genres = ['Action', 'Adventure', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'];

  protected searchControl = new FormControl('', { nonNullable: true });
  protected genreControl = new FormControl('', { nonNullable: true });

  protected movies = signal<Movie[]>([]);
  protected loading = signal(true);

  constructor() {
    // Trigger commun pour le debounce — on combine les deux controls
    const trigger$ = new Subject<void>();
    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => trigger$.next());
    this.genreControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => trigger$.next());

    trigger$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(() => {
        this.loading.set(true);
        return this.api.list({
          title: this.searchControl.value || undefined,
          genre: this.genreControl.value || undefined
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ms => { this.movies.set(ms); this.loading.set(false); },
      error: () => { this.movies.set([]); this.loading.set(false); }
    });

    // Charge initiale
    this.api.list().subscribe({
      next: ms => { this.movies.set(ms); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
