import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api-error.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800">
      <div class="card w-full max-w-md shadow-2xl">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-10 h-10 rounded-lg bg-accent-500 grid place-content-center font-bold text-white">N4</span>
          <div>
            <h1 class="text-xl font-semibold">Neo4flix</h1>
            <p class="text-sm text-zinc-400">Connecte-toi pour continuer</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <label class="block">
            <span class="text-sm text-zinc-300">Username ou email</span>
            <input formControlName="usernameOrEmail" class="input mt-1" autocomplete="username" />
          </label>

          <label class="block">
            <span class="text-sm text-zinc-300">Mot de passe</span>
            <input formControlName="password" type="password" class="input mt-1" autocomplete="current-password" />
          </label>

          @if (errorMsg()) {
            <p class="text-sm text-accent-400">{{ errorMsg() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>

        <p class="mt-6 text-sm text-zinc-400">
          Pas de compte ?
          <a routerLink="/register" class="text-accent-400 hover:text-accent-500 underline-offset-2 hover:underline">
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected errorMsg = signal<string | null>(null);

  protected form = this.fb.nonNullable.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
        this.router.navigateByUrl(redirect);
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as ApiError | null;
        this.errorMsg.set(body?.message ?? 'Erreur de connexion');
        this.loading.set(false);
      }
    });
  }
}
