import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  getItem<T>(key: string, fallback: T): T {
    if (!this.isBrowser) {
      return fallback;
    }
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return fallback;
      }
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  }

  setItem<T>(key: string, value: T): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  removeItem(key: string): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  clear(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
}
