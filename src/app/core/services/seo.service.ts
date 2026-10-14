import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouteMetadata } from '../models/json-lens.model';
import { SEO_ROUTES_DATA } from '../models/seo-content.model';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly dom = inject(DOCUMENT);

  updateRoute(key: string): void {
    const config = SEO_ROUTES_DATA[key] ?? SEO_ROUTES_DATA['formatter'];
    this.updateSeo(config.metadata);
  }

  updateSeo(metadata: RouteMetadata): void {
    // 1. Title
    this.titleService.setTitle(metadata.title);

    // 2. Standard Meta
    this.metaService.updateTag({ name: 'description', content: metadata.description });

    if (metadata.keywords && metadata.keywords.length > 0) {
      this.metaService.updateTag({ name: 'keywords', content: metadata.keywords.join(', ') });
    }

    // 3. OpenGraph
    this.metaService.updateTag({ property: 'og:title', content: metadata.title });
    this.metaService.updateTag({ property: 'og:description', content: metadata.description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: metadata.canonicalPath });
    if (metadata.ogImage) {
      this.metaService.updateTag({ property: 'og:image', content: metadata.ogImage });
    }

    // 4. Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: metadata.title });
    this.metaService.updateTag({ name: 'twitter:description', content: metadata.description });

    // 5. Canonical Link
    this.updateCanonicalLink(metadata.canonicalPath);

    // 6. JSON-LD Schema
    this.updateJsonLd(metadata);
  }

  private updateCanonicalLink(url: string): void {
    let link: HTMLLinkElement | null = this.dom.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.dom.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.dom.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private updateJsonLd(metadata: RouteMetadata): void {
    let script: HTMLScriptElement | null = this.dom.querySelector('script#jsonlens-schema');
    if (!script) {
      script = this.dom.createElement('script');
      script.id = 'jsonlens-schema';
      script.type = 'application/ld+json';
      this.dom.head.appendChild(script);
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'JsonLens',
      url: metadata.canonicalPath,
      description: metadata.description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    };

    script.textContent = JSON.stringify(schema);
  }
}
