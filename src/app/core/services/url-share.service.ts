import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import LZString from 'lz-string';
import { SharePayloadInfo, ShortSharePayloadInfo } from '../models/json-lens.model';

const SHORT_LINK_ENDPOINT = '/api/s';
const MAX_CIPHERTEXT_CHARS = 512 * 1024;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  const chunkSize = 0x2000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToArrayBuffer(b64Url: string): ArrayBuffer {
  const normalized = b64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buf;
}

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
   * Checks URL for ?s=<id>#k=<key> encrypted short-link parameters.
   */
  hasShortShareParams(): { id: string; key: string } | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get('s')?.trim() ?? '';
      const hash = window.location.hash;
      const keyMatch = hash.match(/[#&]k=([^&]+)/);
      const key = keyMatch?.[1]?.trim() ?? '';
      if (!id || !key) {
        return null;
      }
      return { id, key };
    } catch {
      return null;
    }
  }

  /**
   * Encrypts JSON locally with AES-256-GCM and stores ONLY ciphertext on D1 via /api/s.
   * The decryption key stays strictly in the URL #k= fragment and is never sent to the server.
   */
  async createShortSharePayload(jsonContent: string): Promise<ShortSharePayloadInfo> {
    if (!this.isBrowser) {
      throw new Error('Short link generation requires a browser environment.');
    }
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API is unavailable in this browser context.');
    }

    const encoder = new TextEncoder();
    const originalBytes = encoder.encode(jsonContent).length;

    let payloadToCompress = jsonContent;
    try {
      const parsed = JSON.parse(jsonContent);
      payloadToCompress = JSON.stringify(parsed);
    } catch {
      payloadToCompress = jsonContent;
    }

    const compressedBuffer = toArrayBuffer(LZString.compressToUint8Array(payloadToCompress));
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const ivBuffer = new ArrayBuffer(12);
    const ivView = new Uint8Array(ivBuffer);
    crypto.getRandomValues(ivView);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      compressedBuffer
    );
    const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const ciphertextEnvelope = `v1.${uint8ToBase64Url(ivView)}.${uint8ToBase64Url(new Uint8Array(encryptedBuffer))}`;

    if (ciphertextEnvelope.length > MAX_CIPHERTEXT_CHARS) {
      throw new Error(
        'Payload exceeds the 512 KB short-link limit even after compression. Try Instant Link or Download.'
      );
    }

    const response = await fetch(SHORT_LINK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciphertext: ciphertextEnvelope }),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(
        'Short URL endpoint unavailable (requires Cloudflare Pages runtime). Use Instant Link locally.'
      );
    }

    const result = (await response.json()) as { id?: string; expiresAt?: number; error?: string };
    if (!response.ok || !result.id) {
      throw new Error(result.error || 'Failed to generate encrypted short link.');
    }

    const url = new URL(window.location.href);
    url.search = `?s=${encodeURIComponent(result.id)}`;
    url.hash = `k=${uint8ToBase64Url(rawKey)}`;
    const finalUrl = url.toString();
    const shortUrlBytes = encoder.encode(finalUrl).length;
    const percentSaved =
      originalBytes > 0
        ? Math.max(0, Math.round((1 - shortUrlBytes / originalBytes) * 100))
        : 0;

    return {
      id: result.id,
      expiresAt: Number(result.expiresAt) || 0,
      url: finalUrl,
      originalBytes,
      compressedBytes: shortUrlBytes,
      percentSaved,
      isShort: true,
    };
  }

  /**
   * Fetches ciphertext by short ID and decrypts locally using the #k= fragment key.
   */
  async resolveShortSharePayload(id: string, keyBase64Url: string): Promise<string> {
    if (!this.isBrowser) {
      throw new Error('Cannot resolve short link during server-side rendering.');
    }
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API is unavailable in this browser context.');
    }

    const response = await fetch(`${SHORT_LINK_ENDPOINT}?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('Short URL service unavailable in this environment.');
    }

    const data = (await response.json()) as { ciphertext?: string; error?: string };
    if (!response.ok || !data.ciphertext) {
      throw new Error(data.error || 'Short link not found or has expired.');
    }

    const parts = data.ciphertext.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') {
      throw new Error('Unsupported or corrupted short-link payload.');
    }

    const ivBuffer = base64UrlToArrayBuffer(parts[1]);
    const cipherBuffer = base64UrlToArrayBuffer(parts[2]);
    const rawKeyBuffer = base64UrlToArrayBuffer(keyBase64Url);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      rawKeyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      cryptoKey,
      cipherBuffer
    );

    const decompressed = LZString.decompressFromUint8Array(new Uint8Array(decryptedBuffer));
    if (decompressed === null) {
      throw new Error('Failed to decompress decrypted payload.');
    }

    try {
      const parsed = JSON.parse(decompressed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return decompressed;
    }
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
