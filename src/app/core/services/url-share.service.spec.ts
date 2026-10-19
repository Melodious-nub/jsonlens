import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
