import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast/toast.service';

/**
 * Note : les classes Tailwind avec valeurs arbitraires entre crochets
 * (min-w-[260px], animate-[…]) sont interprétées par le parser Angular
 * comme des bindings. On utilise donc des classes utilitaires ou du CSS
 * inline dans la section `styles`.
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast pointer-events-auto rounded-lg border px-4 py-2.5 shadow-2xl flex items-center gap-3 backdrop-blur"
             [class.toast-success]="t.type === 'success'"
             [class.toast-error]="t.type === 'error'"
             [class.toast-info]="t.type === 'info'">
          <span class="text-sm flex-1">{{ t.message }}</span>
          <button (click)="toasts.dismiss(t.id)"
                  class="text-current opacity-60 hover:opacity-100 transition-opacity">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(20px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast { animation: slideIn 0.2s ease-out; min-width: 260px; }
    .toast-success { background: rgba(2, 44, 34, 0.9); border-color: #10b981; color: #d1fae5; }
    .toast-error   { background: rgba(80, 7, 18, 0.9); border-color: #e63946; color: #fee2e2; }
    .toast-info    { background: rgba(34, 34, 46, 0.95); border-color: #3a3a4a; color: #e4e4e7; }
  `]
})
export class ToastHostComponent {
  protected toasts = inject(ToastService);
}
