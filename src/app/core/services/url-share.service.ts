import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import LZString from 'lz-string';

@Injectable({
  providedIn: 'root',
})
export class UrlShareService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  createShareUrl(jsonContent: string): string {
    if (!this.isBrowser) {
      return '';
    }
    try {
      const compressed = LZString.compressToEncodedURIComponent(jsonContent);
      const url = new URL(window.location.href);
      url.hash = `data=${compressed}`;
      return url.toString();
    } catch (e) {
      console.error('Failed to compress JSON for URL sharing:', e);
      return window.location.href;
    }
  }

  readSharedPayload(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('data=')) {
        return null;
      }
      const match = hash.match(/data=([^&]+)/);
      if (!match || !match[1]) {
        return null;
      }
      const decompressed = LZString.decompressFromEncodedURIComponent(match[1]);
      return decompressed || null;
    } catch (e) {
      console.error('Failed to decompress JSON from URL hash:', e);
      return null;
    }
  }

  clearShareHash(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      window.location.hash = '';
    }
  }
}
