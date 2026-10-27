import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import LZString from 'lz-string';
import { SharePayloadInfo } from '../models/json-lens.model';

@Injectable({
  providedIn: 'root',
})
export class UrlShareService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Generates a self-contained, 100% offline and client-side share URL.
   * Pre-minifies JSON in-memory to strip redundant formatting spaces and newlines
   * before LZ-compression into a compact #d= hash.
   */
  createSharePayload(jsonContent: string): SharePayloadInfo {
    if (!this.isBrowser) {
      return { url: '', originalBytes: 0, compressedBytes: 0, percentSaved: 0 };
    }

    try {
      const encoder = new TextEncoder();
      const originalBytes = encoder.encode(jsonContent).length;

      // In-memory pre-minification: strip redundant whitespace/newlines before compressing
      let payloadToCompress = jsonContent;
      try {
        const parsed = JSON.parse(jsonContent);
        payloadToCompress = JSON.stringify(parsed);
      } catch {
        payloadToCompress = jsonContent;
      }

      const compressed = LZString.compressToEncodedURIComponent(payloadToCompress);
      const url = new URL(window.location.href);
      // Compact hash key: #d= (shorter than legacy #data=)
      url.hash = `d=${compressed}`;
      const finalUrl = url.toString();
      const compressedBytes = encoder.encode(finalUrl).length;
      const percentSaved =
        originalBytes > 0
          ? Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100))
          : 0;

      return {
        url: finalUrl,
        originalBytes,
        compressedBytes,
        percentSaved,
      };
    } catch (e) {
      console.error('Failed to compress JSON for URL sharing:', e);
      return {
        url: window.location.href,
        originalBytes: jsonContent.length,
        compressedBytes: window.location.href.length,
        percentSaved: 0,
      };
    }
  }

  createShareUrl(jsonContent: string): string {
    return this.createSharePayload(jsonContent).url;
  }

  /**
   * Reads and decodes shared payload directly from window.location.hash.
   * 100% client-side with zero network calls.
   * Supports compact #d= and legacy #data=.
   */
  readSharedPayload(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const hash = window.location.hash;
      if (!hash) {
        return null;
      }

      // Check compact '#d=' first, then fallback to legacy '#data='
      let encoded: string | null = null;
      const compactMatch = hash.match(/[#&]d=([^&]+)/);
      if (compactMatch && compactMatch[1]) {
        encoded = compactMatch[1];
      } else {
        const legacyMatch = hash.match(/[#&]data=([^&]+)/);
        if (legacyMatch && legacyMatch[1]) {
          encoded = legacyMatch[1];
        }
      }

      if (!encoded) {
        return null;
      }

      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      if (!decompressed) {
        return null;
      }

      // Auto-format for optimal user inspection if valid JSON
      try {
        const parsed = JSON.parse(decompressed);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return decompressed;
      }
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

  async generateQrCodeDataUrl(url: string): Promise<string> {
    const QRCode = (await import('qrcode')).default;
    const svgString = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }

  async generateQrCodePngDataUrl(url: string, width = 512): Promise<string> {
    const QRCode = (await import('qrcode')).default;
    return QRCode.toDataURL(url, {
      width,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }

  downloadQrCodeImage(pngDataUrl: string, filename = 'jsonlens-share-qr.png'): void {
    if (!this.isBrowser) return;
    const link = document.createElement('a');
    link.href = pngDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openQrCodeInNewTab(dataUrl: string): void {
    if (!this.isBrowser) return;
    const win = window.open();
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>JSONLens QR Code</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f19;}img{width:320px;height:320px;max-width:85vw;max-height:85vw;background:#fff;padding:16px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.6);image-rendering:pixelated;}</style></head><body><img src="${dataUrl}" alt="JSONLens Workspace QR Code"/></body></html>`);
      win.document.close();
    }
  }
}
