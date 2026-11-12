import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LZString from 'lz-string';
import { UrlShareService } from './url-share.service';

describe('UrlShareService', () => {
  let service: UrlShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UrlShareService],
    });
    service = TestBed.inject(UrlShareService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('should instantiate', () => {
    expect(service).toBeTruthy();
  });

  it('should create compact offline share payload with minification and metrics', () => {
    const formattedJson = JSON.stringify(
      { message: 'Hello JsonLens', count: 42, tags: ['tool', 'developer'] },
      null,
      2,
    );
    const payload = service.createSharePayload(formattedJson);

    expect(payload.url).toContain('#d=');
    expect(payload.originalBytes).toBeGreaterThan(0);
    expect(payload.compressedBytes).toBeGreaterThan(0);
    expect(payload.percentSaved).toBeGreaterThanOrEqual(0);

    // Simulate window.location.hash
    const hashIndex = payload.url.indexOf('#');
    const hash = payload.url.substring(hashIndex);
    window.location.hash = hash;

    const restored = service.readSharedPayload();
    expect(restored).not.toBeNull();
    expect(JSON.parse(restored!)).toEqual(JSON.parse(formattedJson));

    service.clearShareHash();
    expect(window.location.hash).toBe('');
  });

  it('should support backward compatibility with legacy #data= hash', () => {
    const originalJson = JSON.stringify({ legacy: true, version: 1 });
    const compressed = LZString.compressToEncodedURIComponent(originalJson);
    window.location.hash = `#data=${compressed}`;

    const restored = service.readSharedPayload();
    expect(restored).not.toBeNull();
    expect(JSON.parse(restored!)).toEqual(JSON.parse(originalJson));

    service.clearShareHash();
  });

  it('should handle non-JSON string gracefully without crashing', () => {
    const brokenSnippet = '{ "broken": missingQuotes }';
    const payload = service.createSharePayload(brokenSnippet);

    expect(payload.url).toContain('#d=');

    const hashIndex = payload.url.indexOf('#');
    window.location.hash = payload.url.substring(hashIndex);

    const restored = service.readSharedPayload();
    expect(restored).toBe(brokenSnippet);

    service.clearShareHash();
  });

  it('should generate valid SVG and PNG QR code data URLs', async () => {
    const testUrl = 'https://jsonlens.dev/#d=test123';
    const svgDataUrl = await service.generateQrCodeDataUrl(testUrl);
    expect(svgDataUrl.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    const pngDataUrl = await service.generateQrCodePngDataUrl(testUrl, 256);
    expect(pngDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should encrypt locally with AES-256-GCM and resolve zero-knowledge short links', async () => {
    const sampleJson = JSON.stringify({ secret: 'zero-knowledge-token', count: 7 }, null, 2);
    let capturedCiphertext = '';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr === '/api/s' && init?.method === 'POST') {
        const parsedBody = JSON.parse(init.body as string) as { ciphertext: string };
        capturedCiphertext = parsedBody.ciphertext;
        return new Response(
          JSON.stringify({ id: 'Ab12Cd34', expiresAt: Math.floor(Date.now() / 1000) + 2592000 }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.startsWith('/api/s?id=Ab12Cd34')) {
        return new Response(
          JSON.stringify({ id: 'Ab12Cd34', ciphertext: capturedCiphertext, expiresAt: 9999999999 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ error: 'Unexpected call' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const created = await service.createShortSharePayload(sampleJson);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(created.id).toBe('Ab12Cd34');
    expect(created.isShort).toBe(true);
    expect(created.url).toContain('?s=Ab12Cd34#k=');

    // Server receives only versioned AES-256-GCM ciphertext, never plaintext JSON or key
    expect(capturedCiphertext).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(capturedCiphertext).not.toContain('zero-knowledge-token');

    // Parse query & hash params as when a visitor opens the link
    const parsedUrl = new URL(created.url);
    window.history.replaceState(null, '', `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`);
    const params = service.hasShortShareParams();
    expect(params).not.toBeNull();
    expect(params!.id).toBe('Ab12Cd34');

    const restored = await service.resolveShortSharePayload(params!.id, params!.key);
    expect(JSON.parse(restored)).toEqual(JSON.parse(sampleJson));
  });

  it('should surface a clear error when short link endpoint returns HTML or expires', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    await expect(service.createShortSharePayload('{"a":1}')).rejects.toThrow(
      /Cloudflare Pages runtime/i
    );

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Short link not found or expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(service.resolveShortSharePayload('missing1', 'invalidkey')).rejects.toThrow(
      /not found or expired/i
    );
  });
});
