import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/toast/toast.service';
import { ApiError } from '../../core/models/api-error.model';
import { TwoFactorSetupResponse } from '../../core/models/user.model';

/**
 * Section 2FA du profil — gère 3 états :
 *  - off       : 2FA désactivé, bouton "Activer"
 *  - setup     : QR affiché + input code → submit pour activer
 *  - on        : 2FA activé, bouton "Désactiver" (avec code requis)
 */
@Component({
  selector: 'app-two-factor-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="card">
      <div class="flex items-baseline justify-between mb-4">
        <h2 class="text-lg font-medium">Authentification à deux facteurs</h2>
        @if (isEnabled()) {
          <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Activé
          </span>
        } @else {
          <span class="text-xs px-2 py-0.5 rounded-full bg-ink-700 text-zinc-400 border border-ink-500">
            Désactivé
          </span>
        }
      </div>

      <p class="text-sm text-zinc-400 mb-4">
        Ajoute un code à 6 chiffres généré par une app (Google Authenticator,
        Authy, 1Password…) à ton login. Beaucoup plus difficile à compromettre
        qu'un simple mot de passe.
      </p>

      <!-- ÉTAT : 2FA OFF -->
      @if (mode() === 'off') {
        <button (click)="startSetup()" class="btn-primary" [disabled]="busy()">
          {{ busy() ? 'Préparation…' : 'Activer le 2FA' }}
        </button>
      }

      <!-- ÉTAT : SETUP en cours -->
      @if (mode() === 'setup' && setup()) {
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            <img [src]="setup()!.qrCodeDataUri" alt="QR code 2FA"
                 class="rounded-md border border-ink-500 shrink-0"
                 width="180" height="180" />
            <div class="space-y-2 text-sm">
              <p class="text-zinc-300">1. Scanne ce QR avec ton app authenticator.</p>
              <p class="text-zinc-300">2. Ou saisis cette clé manuellement :</p>
              <code class="block bg-ink-900 border border-ink-600 rounded px-2 py-1 font-mono text-xs break-all">
                {{ setup()!.secret }}
              </code>
              <p class="text-zinc-300 mt-3">3. Saisis le code à 6 chiffres pour confirmer :</p>
            </div>
          </div>

          <div class="flex gap-2 items-start">
            <input [formControl]="codeControl" inputmode="numeric" maxlength="6"
                   placeholder="123456"
                   class="input font-mono text-center tracking-widest w-40" />
            <button (click)="confirmEnable()" class="btn-primary"
                    [disabled]="busy() || codeControl.invalid">
              {{ busy() ? '…' : 'Confirmer' }}
            </button>
            <button (click)="cancelSetup()" class="btn-ghost text-sm">
              Annuler
            </button>
          </div>
        </div>
      }

      <!-- ÉTAT : 2FA ON, possibilité de désactiver -->
      @if (mode() === 'on') {
        @if (!disablingMode()) {
          <button (click)="disablingMode.set(true)" class="btn-ghost">
            Désactiver le 2FA
          </button>
        } @else {
          <div class="space-y-3">
            <p class="text-sm text-zinc-400">
              Saisis un code valide pour confirmer la désactivation.
            </p>
            <div class="flex gap-2 items-start">
              <input [formControl]="codeControl" inputmode="numeric" maxlength="6"
                     placeholder="123456"
                     class="input font-mono text-center tracking-widest w-40" />
              <button (click)="confirmDisable()" class="btn-primary"
                      [disabled]="busy() || codeControl.invalid">
                {{ busy() ? '…' : 'Désactiver' }}
              </button>
              <button (click)="cancelDisable()" class="btn-ghost text-sm">
                Annuler
              </button>
            </div>
          </div>
        }
      }
    </section>
  `
})
export class TwoFactorSectionComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected isEnabled = computed(() => this.auth.currentUser()?.twoFactorEnabled ?? false);

  /** État de la section : off | setup (QR affiché) | on (activé) */
  protected mode = computed<'off' | 'setup' | 'on'>(() => {
    if (this.setup()) return 'setup';
    return this.isEnabled() ? 'on' : 'off';
  });

  protected setup = signal<TwoFactorSetupResponse | null>(null);
  protected disablingMode = signal(false);
  protected busy = signal(false);

  protected codeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)]
  });

  startSetup() {
    this.busy.set(true);
    this.auth.setup2fa().subscribe({
      next: res => { this.setup.set(res); this.busy.set(false); },
      error: (e: HttpErrorResponse) => {
        this.toast.error((e.error as ApiError | null)?.message ?? 'Erreur');
        this.busy.set(false);
      }
    });
  }

  cancelSetup() {
    this.setup.set(null);
    this.codeControl.reset();
  }

  confirmEnable() {
    if (this.codeControl.invalid) return;
    this.busy.set(true);
    this.auth.enable2fa(this.codeControl.value).subscribe({
      next: () => {
        this.toast.success('2FA activé');
        this.setup.set(null);
        this.codeControl.reset();
        this.busy.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.toast.error((e.error as ApiError | null)?.message ?? 'Code invalide');
        this.busy.set(false);
      }
    });
  }

  confirmDisable() {
    if (this.codeControl.invalid) return;
    this.busy.set(true);
    this.auth.disable2fa(this.codeControl.value).subscribe({
      next: () => {
        this.toast.info('2FA désactivé');
        this.disablingMode.set(false);
        this.codeControl.reset();
        this.busy.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.toast.error((e.error as ApiError | null)?.message ?? 'Code invalide');
        this.busy.set(false);
      }
    });
  }

  cancelDisable() {
    this.disablingMode.set(false);
    this.codeControl.reset();
  }
}
