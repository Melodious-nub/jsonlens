import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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

  it('should create and decode a compressed share URL', () => {
    const originalJson = JSON.stringify({ message: 'Hello JsonLens', count: 42 });
    const shareUrl = service.createShareUrl(originalJson);

    expect(shareUrl).toContain('#data=');

    // Simulate window.location.hash
    const hashIndex = shareUrl.indexOf('#');
    const hash = shareUrl.substring(hashIndex);
    window.location.hash = hash;

    const restored = service.readSharedPayload();
    expect(restored).toBe(originalJson);

    service.clearShareHash();
    expect(window.location.hash).toBe('');
  });

  it('should return null when no data hash is present', () => {
    window.location.hash = '';
    expect(service.readSharedPayload()).toBeNull();
  });
});
