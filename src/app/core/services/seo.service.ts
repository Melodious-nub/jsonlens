import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouteMetadata } from '../models/json-lens.model';
import { SEO_ROUTES_DATA, SeoGuideContent } from '../models/seo-content.model';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly dom = inject(DOCUMENT);

  updateRoute(key: string): void {
    const config = SEO_ROUTES_DATA[key] ?? SEO_ROUTES_DATA['formatter'];
    this.updateSeo(config.metadata, config);
  }

  updateSeo(metadata: RouteMetadata, config?: SeoGuideContent): void {
    // 1. Title
    this.titleService.setTitle(metadata.title);

    // 2. Standard Meta
    this.metaService.updateTag({ name: 'description', content: metadata.description });

    if (metadata.keywords && metadata.keywords.length > 0) {
      this.metaService.updateTag({ name: 'keywords', content: metadata.keywords.join(', ') });
    }

    // 3. OpenGraph
    this.metaService.updateTag({ property: 'og:site_name', content: 'JsonLens' });
    this.metaService.updateTag({ property: 'og:locale', content: 'en_US' });
    this.metaService.updateTag({ property: 'og:title', content: metadata.title });
    this.metaService.updateTag({ property: 'og:description', content: metadata.description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: metadata.canonicalPath });

    const ogImage = metadata.ogImage || 'https://jsonlens.pages.dev/icon-512.png';
    this.metaService.updateTag({ property: 'og:image', content: ogImage });
    this.metaService.updateTag({ property: 'og:image:secure_url', content: ogImage });

    // 4. Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:site', content: '@JsonLens' });
    this.metaService.updateTag({ name: 'twitter:creator', content: '@ShawonTalukder' });
    this.metaService.updateTag({ name: 'twitter:title', content: metadata.title });
    this.metaService.updateTag({ name: 'twitter:description', content: metadata.description });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });

    // 5. Canonical Link
    this.updateCanonicalLink(metadata.canonicalPath);

    // 6. JSON-LD Schema
    this.updateJsonLd(metadata, config);
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

  private updateJsonLd(metadata: RouteMetadata, config?: SeoGuideContent): void {
    let script: HTMLScriptElement | null = this.dom.querySelector('script#jsonlens-schema');
    if (!script) {
      script = this.dom.createElement('script');
      script.id = 'jsonlens-schema';
      script.type = 'application/ld+json';
      this.dom.head.appendChild(script);
    }

    const isAboutPage = metadata.softwareType === 'AboutPage' || config?.key === 'about';

    if (isAboutPage) {
      const aboutGraph: Record<string, unknown>[] = [
        {
          '@type': 'AboutPage',
          '@id': 'https://jsonlens.pages.dev/about#webpage',
          url: metadata.canonicalPath,
          name: metadata.title,
          description: metadata.description,
          mainEntity: {
            '@type': 'Person',
            '@id': 'https://jsonlens.pages.dev/about#creator',
            name: 'Shawon Talukder',
            jobTitle: 'Software Engineer',
            worksFor: {
              '@type': 'Organization',
              name: 'Green Delta Insurance PLC',
            },
            url: 'https://jsonlens.pages.dev/about',
            image: 'https://jsonlens.pages.dev/shawon_talukder.jpeg',
            sameAs: [
              'https://github.com/Melodious-nub',
              'https://www.linkedin.com/in/shawon-taluckder',
              'https://www.fiverr.com/talukder_shawon/',
            ],
          },
        },
      ];

      if (config?.faqs && config.faqs.length > 0) {
        aboutGraph.push({
          '@type': 'FAQPage',
          '@id': 'https://jsonlens.pages.dev/about#faq',
          mainEntity: config.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        });
      }

      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': aboutGraph,
      });
    } else {
      const appGraph: Record<string, unknown>[] = [
        {
          '@type': 'WebApplication',
          '@id': 'https://jsonlens.pages.dev/#app',
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
          featureList: [
            '100% In-Memory Client-Side Privacy (Zero Server Uploads)',
            'Sub-Millisecond Prettify & Compact Formatting',
            'One-Click Syntax Auto-Repair for Broken JSON',
            'Interactive AST Tree Lens with JSONPath Generation',
            '12-Language TypeScript, Zod, and Go Type Generator',
            'Side-by-Side Visual Diff Comparator',
            'Compressed LZ-String URL Sharing',
            'Export to JSON, Formatted PDF Report, and CSV',
          ],
        },
      ];

      if (config?.faqs && config.faqs.length > 0) {
        appGraph.push({
          '@type': 'FAQPage',
          '@id': `${metadata.canonicalPath}#faq`,
          mainEntity: config.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        });
      }

      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': appGraph,
      });
    }
  }
}
