import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { UserApi } from '../../core/api/user-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/toast/toast.service';
import { ApiError } from '../../core/models/api-error.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="text-2xl font-semibold">Mon profil</h1>
        <p class="text-sm text-zinc-400 mt-1">
          Membre depuis {{ joinedDate() }}
        </p>
      </header>

      <!-- Édition profil -->
      <section class="card">
        <h2 class="text-lg font-medium mb-4">Informations</h2>
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-4">
          <label class="block">
            <span class="text-sm text-zinc-300">Username</span>
            <input formControlName="username" class="input mt-1" />
          </label>
          <label class="block">
            <span class="text-sm text-zinc-300">Email</span>
            <input formControlName="email" type="email" class="input mt-1" />
          </label>
          <button type="submit" class="btn-primary"
                  [disabled]="profileForm.invalid || profileForm.pristine || profileBusy()">
            {{ profileBusy() ? 'Sauvegarde…' : 'Sauvegarder' }}
          </button>
        </form>
      </section>

      <!-- Mot de passe -->
      <section class="card">
        <h2 class="text-lg font-medium mb-4">Changer le mot de passe</h2>
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
          <label class="block">
            <span class="text-sm text-zinc-300">Mot de passe actuel</span>
            <input formControlName="currentPassword" type="password"
                   class="input mt-1" autocomplete="current-password" />
          </label>
          <label class="block">
            <span class="text-sm text-zinc-300">Nouveau mot de passe</span>
            <input formControlName="newPassword" type="password"
                   class="input mt-1" autocomplete="new-password" />
            <span class="text-xs text-zinc-500">8 caractères minimum</span>
          </label>
          <button type="submit" class="btn-primary"
                  [disabled]="passwordForm.invalid || passwordBusy()">
            {{ passwordBusy() ? 'Mise à jour…' : 'Changer' }}
          </button>
        </form>
      </section>

      <!-- Réseau social -->
      <section class="grid sm:grid-cols-2 gap-6">
        <div class="card">
          <div class="flex items-baseline justify-between mb-3">
            <h2 class="text-lg font-medium">
              Je suis ({{ following().length }})
            </h2>
            <a routerLink="/users" class="text-xs text-accent-400 hover:underline">
              Découvrir
            </a>
          </div>
          @if (following().length === 0) {
            <p class="text-sm text-zinc-500">Tu ne suis personne pour l'instant.</p>
          } @else {
            <ul class="space-y-2">
              @for (u of following(); track u.id) {
                <li class="flex items-center justify-between">
                  <span class="text-sm">{{ u.username }}</span>
                  <button (click)="unfollow(u.id)"
                          class="text-xs text-zinc-400 hover:text-accent-400 transition-colors">
                    Ne plus suivre
                  </button>
                </li>
              }
            </ul>
          }
        </div>

        <div class="card">
          <h2 class="text-lg font-medium mb-3">
            Mes followers ({{ followers().length }})
          </h2>
          @if (followers().length === 0) {
            <p class="text-sm text-zinc-500">Personne ne te suit encore.</p>
          } @else {
            <ul class="space-y-2">
              @for (u of followers(); track u.id) {
                <li class="text-sm">{{ u.username }}</li>
              }
            </ul>
          }
        </div>
      </section>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(UserApi);
  private toast = inject(ToastService);

  protected profileBusy = signal(false);
  protected passwordBusy = signal(false);
  protected following = signal<User[]>([]);
  protected followers = signal<User[]>([]);

  protected profileForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    email:    ['', [Validators.required, Validators.email]]
  });

  protected passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.profileForm.patchValue({ username: u.username, email: u.email });
    this.api.following(u.id).pipe(catchError(() => of([]))).subscribe(list => this.following.set(list));
    this.api.followers(u.id).pipe(catchError(() => of([]))).subscribe(list => this.followers.set(list));
  }

  protected joinedDate(): string {
    const d = this.auth.currentUser()?.createdAt;
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  }

  protected saveProfile() {
    const u = this.auth.currentUser();
    if (!u || this.profileForm.invalid) return;
    this.profileBusy.set(true);
    this.api.update(u.id, this.profileForm.getRawValue()).subscribe({
      next: updated => {
        this.toast.success('Profil mis à jour');
        this.profileForm.patchValue({ username: updated.username, email: updated.email });
        this.profileForm.markAsPristine();
        this.profileBusy.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiError | null;
        this.toast.error(body?.message ?? 'Erreur lors de la mise à jour');
        this.profileBusy.set(false);
      }
    });
  }

  protected changePassword() {
    const u = this.auth.currentUser();
    if (!u || this.passwordForm.invalid) return;
    this.passwordBusy.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.api.changePassword(u.id, currentPassword, newPassword).subscribe({
      next: () => {
        this.toast.success('Mot de passe changé');
        this.passwordForm.reset();
        this.passwordBusy.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiError | null;
        this.toast.error(body?.message ?? 'Erreur');
        this.passwordBusy.set(false);
      }
    });
  }

  protected unfollow(otherId: string) {
    const u = this.auth.currentUser();
    if (!u) return;
    this.api.unfollow(u.id, otherId).subscribe({
      next: () => {
        this.following.update(arr => arr.filter(x => x.id !== otherId));
        this.toast.info('Vous ne suivez plus cet utilisateur');
      },
      error: () => this.toast.error('Erreur')
    });
  }
}
