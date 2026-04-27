import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
      <header>
        <h1 class="text-2xl font-semibold">Catalogue</h1>
        <p class="text-sm text-zinc-400 mt-1">
          {{ movies().length }} film{{ movies().length > 1 ? 's' : '' }}
        </p>
      </header>

      <!-- Barre de filtres -->
      <div [formGroup]="filters" class="flex flex-wrap gap-3 items-end">
        <div class="relative flex-1 min-w-48">
          <input formControlName="title"
                 placeholder="Rechercher un titre…"
                 class="input pl-9" />
          <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </div>

        <select formControlName="genre" class="input w-44">
          <option value="">Tous les genres</option>
          @for (g of genres; track g) {
            <option [value]="g">{{ g }}</option>
          }
        </select>

        <input formControlName="yearFrom" type="number"
               placeholder="Année min"
               min="1888" max="2100"
               class="input w-32" />
        <input formControlName="yearTo" type="number"
               placeholder="Année max"
               min="1888" max="2100"
               class="input w-32" />

        @if (hasActiveFilters()) {
          <button type="button" (click)="resetFilters()"
                  class="text-sm text-zinc-400 hover:text-zinc-200 px-2 py-1">
            Réinitialiser
          </button>
        }
      </div>

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

  protected readonly genres = ['Action', 'Adventure', 'Crime', 'Drama', 'Sci-Fi', 'Thriller'];

  // Form group : 4 contrôles dont 2 numériques. nullable pour gérer le "vide".
  protected filters = new FormGroup({
    title:    new FormControl<string>('', { nonNullable: true }),
    genre:    new FormControl<string>('', { nonNullable: true }),
    yearFrom: new FormControl<number | null>(null),
    yearTo:   new FormControl<number | null>(null)
  });

  protected movies = signal<Movie[]>([]);
  protected loading = signal(true);

  constructor() {
    // Tous les changements passent par valueChanges du form group → un seul flux à debouncer.
    this.filters.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap(() => {
        this.loading.set(true);
        return this.api.list(this.cleanedFilters());
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

  protected hasActiveFilters(): boolean {
    const v = this.filters.value;
    return !!(v.title || v.genre || v.yearFrom != null || v.yearTo != null);
  }

  protected resetFilters() {
    this.filters.reset({ title: '', genre: '', yearFrom: null, yearTo: null });
  }

  /** Strip empty strings + ranges invalides */
  private cleanedFilters() {
    const v = this.filters.value;
    return {
      title:    v.title || undefined,
      genre:    v.genre || undefined,
      yearFrom: v.yearFrom ?? undefined,
      yearTo:   v.yearTo ?? undefined
    };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
