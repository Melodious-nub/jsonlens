import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { AppTheme, THEMES, ThemeDefinition } from '../models/theme.model';
import { StorageService } from './storage.service';

export type { AppTheme, ThemeDefinition };
export { THEMES };

export type ThemeTriggerEvent = MouseEvent | TouchEvent | PointerEvent;

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storage = inject(StorageService);

  /** Active theme signal: 'dark' | 'light' | 'tokyo-night' | 'dracula' | 'nord' */
  readonly theme = signal<AppTheme>('dark');

  /** Available centralized theme definitions */
  readonly themes = THEMES;

  /** True if the current theme is a dark variant */
  readonly isDark = computed<boolean>(() => {
    const current = this.theme();
    const def = THEMES.find((t) => t.id === current);
    return def ? def.isDark : current !== 'light';
  });

  /** Previous dark theme remembered when toggling to light mode */
  private lastDarkTheme: AppTheme = 'dark';

  /** Guard against overlapping View Transitions on rapid user clicks */
  private isTransitioning = false;

  constructor() {
    if (this.isBrowser) {
      const saved = this.storage.getItem<string | null>('jsonlens_theme', null);
      if (saved && THEMES.some((t) => t.id === saved)) {
        const validatedTheme = saved as AppTheme;
        this.theme.set(validatedTheme);
        if (validatedTheme !== 'light') {
          this.lastDarkTheme = validatedTheme;
        }
      }

      this.applyThemeToDOM(this.theme());

      // Reactive synchronization safeguard
      effect(() => {
        this.applyThemeToDOM(this.theme());
      });
    }
  }

  /**
   * Sets the active theme directly with the circular ripple reveal animation.
   */
  setTheme(newTheme: AppTheme, event?: ThemeTriggerEvent): void {
    if (this.theme() === newTheme) return;

    if (newTheme !== 'light') {
      this.lastDarkTheme = newTheme;
    }

    this.runWithViewTransition(() => {
      this.theme.set(newTheme);
      this.applyThemeToDOM(newTheme);
    }, event);
  }

  /**
   * Quick toggle between light and dark modes.
   * If on a dark theme, flips to 'light'.
   * If on 'light', restores the previously selected dark theme (e.g., 'tokyo-night').
   */
  toggleTheme(event?: ThemeTriggerEvent): void {
    const nextTheme: AppTheme =
      this.theme() === 'light' ? this.lastDarkTheme : 'light';

    this.setTheme(nextTheme, event);
  }

  /**
   * Cycles sequentially through all 5 themes.
   */
  cycleTheme(event?: ThemeTriggerEvent): void {
    const allIds = THEMES.map((t) => t.id);
    const currentIndex = allIds.indexOf(this.theme());
    const nextIndex = (currentIndex + 1) % allIds.length;
    this.setTheme(allIds[nextIndex], event);
  }

  /**
   * Synchronously sets DOM attributes, updates storage, and updates status-bar meta tags.
   * Must run synchronously inside startViewTransition so the browser's snapshot captures the new theme.
   */
  applyThemeToDOM(theme: AppTheme): void {
    if (!this.isBrowser) return;

    document.documentElement.setAttribute('data-theme', theme);
    this.storage.setItem('jsonlens_theme', theme);
    this.updateMetaThemeColor(theme);
  }

  /**
   * Executes a state update with circular ripple wave animation
   * using the native View Transitions API and Web Animations API.
   */
  private runWithViewTransition(
    updateFn: () => void,
    event?: ThemeTriggerEvent,
  ): void {
    if (!this.isBrowser) {
      updateFn();
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

    // Graceful fallback if View Transitions is unsupported, reduced motion requested,
    // or if a transition is already in progress.
    if (!doc.startViewTransition || prefersReducedMotion || this.isTransitioning) {
      updateFn();
      return;
    }

    const coords = this.extractCoordinates(event);
    const x = coords.x;
    const y = coords.y;

    // Calculate maximum radius required to cover the furthest corner of the viewport
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    this.isTransitioning = true;

    try {
      const transition = doc.startViewTransition(() => {
        updateFn();
      });

      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];

          document.documentElement.animate(
            { clipPath },
            {
              duration: 450,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              pseudoElement: '::view-transition-new(root)',
            },
          );
        })
        .catch(() => {
          // If transition is skipped, DOM was already updated synchronously in callback
        });

      transition.finished
        .finally(() => {
          this.isTransitioning = false;
        })
        .catch(() => {
          this.isTransitioning = false;
        });
    } catch {
      this.isTransitioning = false;
      updateFn();
    }
  }

  /**
   * Extracts interaction coordinates from MouseEvent, TouchEvent, or PointerEvent,
   * falling back to top-right toolbar position.
   */
  private extractCoordinates(event?: ThemeTriggerEvent): { x: number; y: number } {
    if (!event) {
      return { x: window.innerWidth - 48, y: 28 };
    }

    // Touch event handling
    if ('touches' in event && event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
    if ('changedTouches' in event && event.changedTouches && event.changedTouches.length > 0) {
      return {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      };
    }

    // Mouse / Pointer event handling
    if ('clientX' in event && typeof event.clientX === 'number') {
      return {
        x: event.clientX,
        y: event.clientY,
      };
    }

    return { x: window.innerWidth - 48, y: 28 };
  }

  private updateMetaThemeColor(theme: AppTheme): void {
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) return;

    let hexColor = '#09090b';
    if (theme === 'light') {
      hexColor = '#f8fafc';
    } else if (theme === 'tokyo-night') {
      hexColor = '#16161e';
    } else if (theme === 'dracula') {
      hexColor = '#21222c';
    } else if (theme === 'nord') {
      hexColor = '#242933';
    }

    metaTag.setAttribute('content', hexColor);
  }
}
