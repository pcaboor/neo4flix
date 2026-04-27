import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { UserApi } from '../../core/api/user-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/toast/toast.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">Découvrir</h1>
        <p class="text-sm text-zinc-400 mt-1">
          Trouve et suis d'autres utilisateurs pour voir leurs recommandations.
        </p>
      </header>

      <div class="relative max-w-md">
        <input [formControl]="search"
               placeholder="Rechercher un username…"
               class="input pl-9" />
        <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
      </div>

      @if (loading()) {
        <p class="text-zinc-500">Chargement…</p>
      } @else if (visibleUsers().length === 0) {
        <p class="text-zinc-500">Aucun utilisateur trouvé.</p>
      } @else {
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (u of visibleUsers(); track u.id) {
            <li class="card !p-4 flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-full bg-ink-700 grid place-content-center
                            font-semibold text-zinc-300 shrink-0">
                  {{ initial(u.username) }}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-zinc-100 truncate">{{ u.username }}</p>
                  <p class="text-xs text-zinc-500 truncate">{{ u.email }}</p>
                </div>
              </div>

              @if (followingIds().has(u.id)) {
                <button (click)="unfollow(u.id)" [disabled]="busy() === u.id" class="btn-ghost text-xs py-1 px-3">
                  Suivi
                </button>
              } @else {
                <button (click)="follow(u.id)" [disabled]="busy() === u.id" class="btn-primary text-xs py-1 px-3">
                  Suivre
                </button>
              }
            </li>
          }
        </ul>
      }
    </div>
  `
})
export class UsersComponent implements OnDestroy {
  private api = inject(UserApi);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  protected search = new FormControl('', { nonNullable: true });
  protected users = signal<User[]>([]);
  protected followingIds = signal<Set<string>>(new Set());
  protected loading = signal(true);
  protected busy = signal<string | null>(null);

  /** Filtre soi-même de la liste */
  protected visibleUsers = computed(() => {
    const me = this.auth.currentUser()?.id;
    return this.users().filter(u => u.id !== me);
  });

  constructor() {
    const me = this.auth.currentUser();
    if (!me) return;

    // Charge la liste de following pour cocher les boutons
    this.api.following(me.id).subscribe(list => {
      this.followingIds.set(new Set(list.map(u => u.id)));
    });

    // Charge initiale
    this.api.list().subscribe({
      next: us => { this.users.set(us); this.loading.set(false); },
      error: () => this.loading.set(false)
    });

    // Recherche debounced
    this.search.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => {
        this.loading.set(true);
        return this.api.list(q || undefined);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: us => { this.users.set(us); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected initial(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  protected follow(otherId: string) {
    const me = this.auth.currentUser();
    if (!me) return;
    this.busy.set(otherId);
    this.api.follow(me.id, otherId).subscribe({
      next: () => {
        this.followingIds.update(s => { const next = new Set(s); next.add(otherId); return next; });
        this.toast.success('Vous suivez maintenant cet utilisateur');
        this.busy.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? 'Erreur');
        this.busy.set(null);
      }
    });
  }

  protected unfollow(otherId: string) {
    const me = this.auth.currentUser();
    if (!me) return;
    this.busy.set(otherId);
    this.api.unfollow(me.id, otherId).subscribe({
      next: () => {
        this.followingIds.update(s => { const next = new Set(s); next.delete(otherId); return next; });
        this.toast.info('Vous ne suivez plus cet utilisateur');
        this.busy.set(null);
      },
      error: () => this.busy.set(null)
    });
  }
}
