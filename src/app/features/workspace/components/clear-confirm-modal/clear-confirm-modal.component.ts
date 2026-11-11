import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import {
  LucideAngularModule,
  Trash2,
  X,
} from 'lucide-angular';

@Component({
  selector: 'app-clear-confirm-modal',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './clear-confirm-modal.component.html',
  styleUrl: './clear-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearConfirmModalComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Inputs
  readonly isOpen = input<boolean>(false);

  // Outputs
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  // Icons
  readonly trashIcon = Trash2;
  readonly closeIcon = X;

  constructor() {
    // Body scroll lock effect
    effect(() => {
      if (!this.isBrowser) return;
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Cleanup body scroll on component destroy
    this.destroyRef.onDestroy(() => {
      if (this.isBrowser) {
        document.body.style.overflow = '';
      }
    });

    // Global keyboard listener for Escape key
    if (this.isBrowser) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!this.isOpen()) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.onCancel();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('keydown', onKeyDown);
      });
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}

