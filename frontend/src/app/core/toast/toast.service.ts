import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

/**
 * File de toasts globale, exposée sous forme de signal.
 * Les composants qui veulent afficher un toast appellent toast.success/error/info.
 * Le ToastHostComponent observe le signal et anime l'apparition/disparition.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void { this.push('success', message); }
  error(message: string): void   { this.push('error', message); }
  info(message: string): void    { this.push('info', message); }

  private push(type: Toast['type'], message: string) {
    const id = this.nextId++;
    this.toasts.update(arr => [...arr, { id, type, message }]);
    setTimeout(() => this.dismiss(id), 3500);
  }

  dismiss(id: number) {
    this.toasts.update(arr => arr.filter(t => t.id !== id));
  }
}
