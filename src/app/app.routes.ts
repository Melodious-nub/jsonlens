import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lens-page/lens-page.component').then((m) => m.LensPageComponent),
    title: 'JsonLens — JSON Formatter & Beautifier | Free Online Developer Tool',
    data: { seoKey: 'formatter', defaultLens: 'code' },
  },
  {
    path: 'json-validator',
    loadComponent: () =>
      import('./pages/lens-page/lens-page.component').then((m) => m.LensPageComponent),
    title: 'JSON Validator & Auto-Repair Tool | JsonLens',
    data: { seoKey: 'validator', defaultLens: 'code' },
  },
  {
    path: 'json-minifier',
    loadComponent: () =>
      import('./pages/lens-page/lens-page.component').then((m) => m.LensPageComponent),
    title: 'JSON Minifier & Compressor Online | JsonLens',
    data: { seoKey: 'minifier', defaultLens: 'code' },
  },
  {
    path: 'json-to-typescript',
    loadComponent: () =>
      import('./pages/lens-page/lens-page.component').then((m) => m.LensPageComponent),
    title: 'JSON to TypeScript & Zod Schema Converter Online | JsonLens',
    data: { seoKey: 'typescript', defaultLens: 'type' },
  },
  {
    path: 'json-diff',
    loadComponent: () =>
      import('./pages/lens-page/lens-page.component').then((m) => m.LensPageComponent),
    title: 'JSON Diff & Compare Tool Online | JsonLens',
    data: { seoKey: 'diff', defaultLens: 'diff' },
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about-page/about-page.component').then((m) => m.AboutPageComponent),
    title: 'About JsonLens & Creator — High-Performance Client-Side JSON Suite & FAQs',
  },
  {
    path: 'creator',
    redirectTo: 'about',
    pathMatch: 'full',
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./pages/support-page/support-page.component').then((m) => m.SupportPageComponent),
    title: 'Support JsonLens — Open Source Sponsorship & Coming Soon Plans',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
