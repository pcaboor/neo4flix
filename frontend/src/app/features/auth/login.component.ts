import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api-error.model';

/**
 * Login en 2 phases :
 *  - 'credentials' : username + password
 *  - 'totp'        : code 6 chiffres (apparaît si requires2fa=true)
 */
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
            <p class="text-sm text-zinc-400">
              @if (phase() === 'credentials') {
                Connecte-toi pour continuer
              } @else {
                Code à 6 chiffres de ton authenticator
              }
            </p>
          </div>
        </div>

        @if (phase() === 'credentials') {
          <form [formGroup]="credentialsForm" (ngSubmit)="submitCredentials()" class="space-y-4">
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

            <button type="submit" class="btn-primary w-full" [disabled]="loading() || credentialsForm.invalid">
              {{ loading() ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>

          <p class="mt-6 text-sm text-zinc-400">
            Pas de compte ?
            <a routerLink="/register" class="text-accent-400 hover:text-accent-500 underline-offset-2 hover:underline">
              Créer un compte
            </a>
          </p>
        } @else {
          <form [formGroup]="totpForm" (ngSubmit)="submitTotp()" class="space-y-4">
            <label class="block">
              <span class="text-sm text-zinc-300">Code à 6 chiffres</span>
              <input formControlName="code" inputmode="numeric"
                     maxlength="6"
                     class="input mt-1 text-center font-mono text-lg tracking-widest"
                     placeholder="123456" />
            </label>

            @if (errorMsg()) {
              <p class="text-sm text-accent-400">{{ errorMsg() }}</p>
            }

            <button type="submit" class="btn-primary w-full" [disabled]="loading() || totpForm.invalid">
              {{ loading() ? 'Vérification…' : 'Valider' }}
            </button>

            <button type="button" (click)="cancelTotp()" class="btn-ghost w-full text-sm">
              Annuler
            </button>
          </form>
        }
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected phase = signal<'credentials' | 'totp'>('credentials');
  protected loading = signal(false);
  protected errorMsg = signal<string | null>(null);
  private ticket: string | null = null;

  protected credentialsForm = this.fb.nonNullable.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  protected totpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  submitCredentials() {
    if (this.credentialsForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.credentialsForm.getRawValue()).subscribe({
      next: res => {
        if (res.requires2fa && res.twoFactorTicket) {
          this.ticket = res.twoFactorTicket;
          this.phase.set('totp');
          this.loading.set(false);
        } else {
          this.redirectAfterLogin();
        }
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  submitTotp() {
    if (this.totpForm.invalid || !this.ticket) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.login2fa(this.ticket, this.totpForm.getRawValue().code).subscribe({
      next: () => this.redirectAfterLogin(),
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  cancelTotp() {
    this.phase.set('credentials');
    this.totpForm.reset();
    this.ticket = null;
    this.errorMsg.set(null);
  }

  private redirectAfterLogin() {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
    this.router.navigateByUrl(redirect);
  }

  private handleError(err: HttpErrorResponse) {
    const body = err.error as ApiError | null;
    this.errorMsg.set(body?.message ?? 'Erreur de connexion');
    this.loading.set(false);
  }
}
