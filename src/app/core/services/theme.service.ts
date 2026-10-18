import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storage = inject(StorageService);

  readonly theme = signal<AppTheme>('dark');

  constructor() {
    if (this.isBrowser) {
      const savedTheme = this.storage.getItem<AppTheme>('jsonlens_theme', 'dark');
      this.theme.set(savedTheme);

      // Sync attribute and storage when theme signal changes
      effect(() => {
        const current = this.theme();
        document.documentElement.setAttribute('data-theme', current);
        this.storage.setItem('jsonlens_theme', current);
      });
    }
  }

  toggleTheme(event?: MouseEvent): void {
    const nextTheme: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';

    if (!this.isBrowser) {
      this.theme.set(nextTheme);
      return;
    }

    const doc = document as Document & {
      startViewTransition?: (callback: () => Promise<void> | void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    };

    const prefersReducedMotion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (!doc.startViewTransition || prefersReducedMotion) {
      this.theme.set(nextTheme);
      return;
    }

    // Capture coordinates from the toggle click or fallback to top-right toolbar position
    const x = event?.clientX ?? window.innerWidth - 48;
    const y = event?.clientY ?? 28;

    // Calculate maximum radius required to cover the furthest corner of the viewport
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      this.theme.set(nextTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath,
        },
        {
          duration: 480,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  }

  setTheme(newTheme: AppTheme): void {
    this.theme.set(newTheme);
  }
}
