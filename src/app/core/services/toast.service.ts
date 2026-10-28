import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, type: ToastType = 'success', duration = 3000): void {
    const id = `toast-${Date.now()}-${++this.nextId}`;
    const newToast: ToastMessage = { id, message, type };

    this.toasts.update((current) => [...current, newToast]);

    setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
