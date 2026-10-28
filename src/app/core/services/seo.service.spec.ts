import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { describe, expect, it, beforeEach } from 'vitest';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let titleService: Title;
  let metaService: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, Title, Meta],
    });

    service = TestBed.inject(SeoService);
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update SEO metadata and canonical link for formatter route', () => {
    service.updateRoute('formatter');

    expect(titleService.getTitle()).toContain('JsonLens');
    const descMeta = metaService.getTag('name="description"');
    expect(descMeta?.content).toBeTruthy();
    expect(descMeta?.content).toContain('JSON');

    const ogTitle = metaService.getTag('property="og:title"');
    expect(ogTitle?.content).toContain('JsonLens');

    const ogUrl = metaService.getTag('property="og:url"');
    expect(ogUrl?.content).toBe('https://jsonlens.pages.dev/');

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    expect(canonicalEl?.getAttribute('href')).toBe('https://jsonlens.pages.dev/');

    const scriptEl = document.querySelector('script#jsonlens-schema');
    expect(scriptEl?.textContent).toContain('WebApplication');
    expect(scriptEl?.textContent).toContain('https://jsonlens.pages.dev/');
  });

  it('should update SEO metadata, Person schema, and canonical link for about route', () => {
    service.updateRoute('about');

    expect(titleService.getTitle()).toContain('About JsonLens & Creator — Shawon Talukder');
    const descMeta = metaService.getTag('name="description"');
    expect(descMeta?.content).toContain('Shawon Talukder');

    const ogUrl = metaService.getTag('property="og:url"');
    expect(ogUrl?.content).toBe('https://jsonlens.pages.dev/about/');

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    expect(canonicalEl?.getAttribute('href')).toBe('https://jsonlens.pages.dev/about/');

    const scriptEl = document.querySelector('script#jsonlens-schema');
    expect(scriptEl?.textContent).toContain('AboutPage');
    expect(scriptEl?.textContent).toContain('Shawon Talukder');
    expect(scriptEl?.textContent).toContain('FAQPage');
  });
});
