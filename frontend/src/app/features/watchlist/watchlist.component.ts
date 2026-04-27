import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserApi } from '../../core/api/user-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { WatchlistItem } from '../../core/models/watchlist.model';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">Ma watchlist</h1>
        <p class="text-sm text-zinc-400 mt-1">
          {{ items().length }} film{{ items().length > 1 ? 's' : '' }} à voir
        </p>
      </header>

      @if (loading()) {
        <p class="text-zinc-500">Chargement…</p>
      } @else if (items().length === 0) {
        <div class="card text-center text-zinc-400 py-12">
          <p>Ta watchlist est vide.</p>
          <a routerLink="/movies" class="btn-primary mt-4 inline-flex">
            Parcourir le catalogue
          </a>
        </div>
      } @else {
        <ul class="divide-y divide-ink-700 border border-ink-700 rounded-lg overflow-hidden">
          @for (item of items(); track item.id) {
            <li class="flex items-center justify-between gap-4 p-4 hover:bg-ink-800 transition-colors">
              <a [routerLink]="['/movies', item.id]" class="flex-1 min-w-0">
                <p class="font-medium text-zinc-100 truncate">{{ item.title }}</p>
                <p class="text-xs text-zinc-500 mt-0.5">
                  {{ item.releaseYear }} · ajouté {{ formatDate(item.addedAt) }}
                </p>
              </a>
              <button (click)="remove(item.id)"
                      class="text-sm text-zinc-400 hover:text-accent-400 transition-colors px-3 py-1.5"
                      [disabled]="busy() === item.id">
                Retirer
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `
})
export class WatchlistComponent {
  private api = inject(UserApi);
  private auth = inject(AuthService);

  protected items = signal<WatchlistItem[]>([]);
  protected loading = signal(true);
  protected busy = signal<string | null>(null);

  constructor() {
    const userId = this.auth.currentUser()?.id;
    if (userId) this.load(userId);
    else this.loading.set(false);
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    const days = Math.round((Date.now() - d.getTime()) / 86400_000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 30) return `il y a ${days} jours`;
    return d.toLocaleDateString('fr-FR');
  }

  protected remove(movieId: string) {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.busy.set(movieId);
    this.api.removeFromWatchlist(userId, movieId).subscribe({
      next: () => {
        this.items.update(arr => arr.filter(i => i.id !== movieId));
        this.busy.set(null);
      },
      error: () => this.busy.set(null)
    });
  }

  private load(userId: string) {
    this.api.watchlist(userId).subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
