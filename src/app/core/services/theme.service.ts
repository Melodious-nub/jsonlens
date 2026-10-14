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

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(newTheme: AppTheme): void {
    this.theme.set(newTheme);
  }
}
