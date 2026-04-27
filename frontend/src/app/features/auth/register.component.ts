import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api-error.model';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800">
      <div class="card w-full max-w-md shadow-2xl">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-10 h-10 rounded-lg bg-accent-500 grid place-content-center font-bold text-white">N4</span>
          <div>
            <h1 class="text-xl font-semibold">Créer un compte</h1>
            <p class="text-sm text-zinc-400">Quelques informations</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <label class="block">
            <span class="text-sm text-zinc-300">Username</span>
            <input formControlName="username" class="input mt-1" autocomplete="username" />
            <span class="text-xs text-zinc-500">3-30 caractères, lettres/chiffres/_/./-</span>
          </label>

          <label class="block">
            <span class="text-sm text-zinc-300">Email</span>
            <input formControlName="email" type="email" class="input mt-1" autocomplete="email" />
          </label>

          <label class="block">
            <span class="text-sm text-zinc-300">Mot de passe</span>
            <input formControlName="password" type="password" class="input mt-1" autocomplete="new-password" />
            <span class="text-xs text-zinc-500">8 caractères minimum</span>
          </label>

          @if (errorMsg()) {
            <p class="text-sm text-accent-400">{{ errorMsg() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Création…' : 'Créer le compte' }}
          </button>
        </form>

        <p class="mt-6 text-sm text-zinc-400">
          Déjà un compte ?
          <a routerLink="/login" class="text-accent-400 hover:text-accent-500 underline-offset-2 hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected loading = signal(false);
  protected errorMsg = signal<string | null>(null);

  protected form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    const { username, email, password } = this.form.getRawValue();

    // Register puis login automatique pour fluidifier l'UX
    this.auth.register({ username, email, password }).pipe(
      switchMap(() => this.auth.login({ usernameOrEmail: username, password }))
    ).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiError | null;
        const detail = body?.details?.[0];
        this.errorMsg.set(detail || body?.message || 'Erreur lors de la création du compte');
        this.loading.set(false);
      }
    });
  }
}
