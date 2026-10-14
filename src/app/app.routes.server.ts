import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'json-validator', renderMode: RenderMode.Prerender },
  { path: 'json-minifier', renderMode: RenderMode.Prerender },
  { path: 'json-to-typescript', renderMode: RenderMode.Prerender },
  { path: 'json-diff', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender },
];
