import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Movie } from '../../core/models/movie.model';

/**
 * Carte film cliquable utilisée dans le catalogue, la watchlist
 * et les recommandations. Tout-en-un avec un poster (placeholder),
 * titre, année, genres.
 */
@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/movies', movie().id]"
       class="card hover:border-accent-500 transition-colors block group">
      <div class="aspect-[2/3] rounded-md bg-gradient-to-br from-ink-700 to-ink-600 mb-3
                  grid place-items-center overflow-hidden">
        @if (movie().posterUrl) {
          <img [src]="movie().posterUrl" [alt]="movie().title"
               class="w-full h-full object-cover" />
        } @else {
          <span class="text-4xl text-zinc-700 group-hover:text-accent-500 transition-colors font-mono">
            {{ initials() }}
          </span>
        }
      </div>
      <h3 class="font-medium text-zinc-100 group-hover:text-white truncate">
        {{ movie().title }}
      </h3>
      <p class="text-xs text-zinc-500 mt-0.5">
        {{ movie().releaseYear }}
        @if (movie().duration) {
          · {{ movie().duration }} min
        }
      </p>
      <div class="flex flex-wrap gap-1 mt-2">
        @for (g of movie().genres.slice(0, 3); track g) {
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-700 text-zinc-400 border border-ink-500">
            {{ g }}
          </span>
        }
      </div>
    </a>
  `
})
export class MovieCardComponent {
  movie = input.required<Movie>();

  protected initials() {
    return this.movie().title
      .split(' ')
      .map(w => w[0])
      .filter(c => c)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
