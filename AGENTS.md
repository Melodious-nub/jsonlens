# Angular Modern Architecture & Project Rules: JsonLens

This document defines the mandatory architectural patterns, coding guidelines, performance practices, and UI standards for this project.
Every component, service, directive, and feature added or modified MUST follow these rules without exception.

---

## 1. Core Architecture Principles

1. **Signals-First Reactivity**: Use Angular Signals (`signal`, `computed`, `effect`) as the primary mechanism for state management. Avoid unnecessary RxJS in components.
2. **Standalone Everything**: All components, directives, and pipes must be standalone (Angular modern default). Do NOT create `NgModule`s.
3. **Mandatory OnPush**: Every component must explicitly declare `changeDetection: ChangeDetectionStrategy.OnPush`.
4. **Zoneless & SSR Prepared**: Design all code to be SSR-safe (`@angular/ssr`) and ready for zoneless change detection.
5. **Separation of Concerns**:
   - `core/`: Application-wide singleton services, interceptors, global error handlers, hydration guards.
   - `features/`: Domain-driven feature modules/views, lazy-loaded via routes.
   - `shared/`: Pure, reusable UI components (buttons, modals, tooltips), pipes, and utilities without business domain logic.

---

## 2. Component Guidelines & Modern APIs

### A. Component Declaration
- Always specify `changeDetection: ChangeDetectionStrategy.OnPush`.
- Import only what the component template and class directly use in `imports: [...]`.
- Keep component classes clean, focused, and concise.

```typescript
// ✅ DO: Modern standalone component with OnPush and Signals
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-json-viewer',
  imports: [CommonModule, JsonTreeComponent],
  templateUrl: './json-viewer.component.html',
  styleUrl: './json-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonViewerComponent {
  // Signal inputs
  readonly data = input.required<Record<string, unknown>>();
  readonly isExpanded = input<boolean>(false);
  
  // Signal output
  readonly nodeSelected = output<string>();

  // Local state
  readonly filterQuery = signal<string>('');
  
  // Computed values
  readonly filteredData = computed(() => {
    const query = this.filterQuery().toLowerCase();
    // derived computation...
  });
}
```

```typescript
// ❌ DON'T: Legacy decorators or Default change detection
@Component({
  selector: 'app-legacy',
  templateUrl: './legacy.component.html',
  // Missing OnPush!
})
export class LegacyComponent {
  @Input() data: any; // ❌ No decorators, no `any`
  @Output() changed = new EventEmitter<any>(); // ❌ Use output()
}
```

### B. Inputs, Outputs, and Queries
- Use `input()` and `input.required()` instead of `@Input()`.
- Use `output()` instead of `@Output() / EventEmitter`.
- Use `model()` for two-way bindings.
- Use `viewChild()` and `viewChildren()` instead of `@ViewChild() / @ViewChildren()`.
- Use `contentChild()` and `contentChildren()` instead of `@ContentChild() / @ContentChildren()`.

### C. Dependency Injection
- Always use the `inject()` function for dependency injection. Do NOT use constructor injection.

```typescript
// ✅ DO
export class JsonEditorComponent {
  private readonly router = inject(Router);
  private readonly parserService = inject(JsonParserService);
  private readonly destroyRef = inject(DestroyRef);
}

// ❌ DON'T
export class LegacyComponent {
  constructor(private router: Router, private parserService: JsonParserService) {}
}
```

---

## 3. Control Flow & Template Standards

Angular's built-in control flow must be used exclusively. **Legacy structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) are strictly prohibited.**

### A. Conditional Rendering (`@if`, `@else if`, `@else`)
```html
<!-- ✅ DO -->
@if (isLoading()) {
  <app-skeleton-loader />
} @else if (hasError()) {
  <app-error-banner [message]="errorMessage()" />
} @else {
  <app-json-tree [data]="parsedData()" />
}

<!-- ❌ DON'T: *ngIf -->
<div *ngIf="isLoading; else content">...</div>
```

### B. List Iteration (`@for` with `track`)
Every `@for` loop **must** specify an optimal and unique `track` expression. Never use `track $index` if items have a unique ID or key.

```html
<!-- ✅ DO -->
@for (node of jsonNodes(); track node.id) {
  <app-node-row [node]="node" (select)="onSelect($event)" />
} @empty {
  <p class="empty-state">No JSON nodes found.</p>
}

<!-- ❌ DON'T: *ngFor or missing track -->
<div *ngFor="let node of jsonNodes">...</div>
```

### C. Deferred Loading (`@defer`) for High Performance
Use `@defer` to aggressively lazy-load heavy UI elements, charts, visualizers, modals, and below-the-fold content:

```html
<!-- ✅ DO: Defer load heavy visualization components -->
@defer (on viewport; prefetch on idle) {
  <app-json-graph-view [data]="graphData()" />
} @placeholder {
  <div class="graph-placeholder">Scroll to load visualizer...</div>
} @loading (minimum 250ms) {
  <app-spinner />
} @error {
  <p class="error-msg">Failed to load visualizer module.</p>
}
```

---

## 4. Memory Leak Prevention & Lifecycle Hygiene

Memory leaks are a critical risk in data-intensive client applications (like JSON visualization and large file parsing). Follow these immutable safety rules:

1. **Prefer `toSignal()` over manual `.subscribe()`**:
   When reading from RxJS observables (e.g. from `ActivatedRoute`, `HttpClient`), convert them directly to signals using `toSignal()`:
   ```typescript
   private readonly route = inject(ActivatedRoute);
   readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} });
   ```

2. **Mandatory `takeUntilDestroyed()`**:
   If an Observable must be subscribed to manually, it **must** be tied to `takeUntilDestroyed()`:
   ```typescript
   // In constructor/field injection context:
   this.myStream$.pipe(takeUntilDestroyed()).subscribe(val => { ... });

   // In methods / outside injection context:
   private readonly destroyRef = inject(DestroyRef);
   
   startListening() {
     this.externalEvent$.pipe(
       takeUntilDestroyed(this.destroyRef)
     ).subscribe(event => this.handleEvent(event));
   }
   ```

3. **DOM & Browser API Cleanup**:
   Any direct browser subscription (`addEventListener`, `ResizeObserver`, `IntersectionObserver`, `setInterval`, `setTimeout`, WebSockets, Web Workers) must be registered for cleanup using `DestroyRef.onDestroy()`:
   ```typescript
   private readonly destroyRef = inject(DestroyRef);

   ngOnInit() {
     const observer = new ResizeObserver((entries) => this.onResize(entries));
     observer.observe(this.containerEl.nativeElement);

     this.destroyRef.onDestroy(() => {
       observer.disconnect();
     });
   }
   ```

4. **Avoid Storing Large Objects in Long-Lived Closures**:
   Ensure massive parsed JSON objects or file buffers are dereferenced when components are destroyed to allow garbage collection.

---

## 5. Routing & Code Splitting

1. **Lazy Loading by Default**:
   All feature routes must use `loadComponent` or `loadChildren` with dynamic imports. Eager loading is reserved only for top-level shell routes if required.

   ```typescript
   // ✅ app.routes.ts
   import { Routes } from '@angular/router';

   export const routes: Routes = [
     {
       path: '',
       redirectTo: 'editor',
       pathMatch: 'full',
     },
     {
       path: 'editor',
       loadComponent: () => import('./features/editor/editor.component').then(m => m.EditorComponent),
       title: 'JSONLens - Editor & Visualizer',
     },
     {
       path: 'diff',
       loadComponent: () => import('./features/diff/diff.component').then(m => m.DiffComponent),
       title: 'JSONLens - Diff Comparison',
     },
     {
       path: '**',
       loadComponent: () => import('./core/pages/not-found/not-found.component').then(m => m.NotFoundComponent),
     }
   ];
   ```

2. **Functional Guards & Interceptors**:
   Use functional route guards (`CanActivateFn`, `CanMatchFn`) and functional HTTP interceptors (`HttpInterceptorFn`). Never use class-based guards/interceptors.

---

## 6. SSR & Hydration Safety

Because the project includes `@angular/ssr`:

1. **Never directly access browser globals** (`window`, `document`, `localStorage`, `sessionStorage`, `navigator`) in the component initialization phase or root module scope.
2. **Use Angular Platform Utilities**:
   ```typescript
   import { isPlatformBrowser } from '@angular/common';
   import { PLATFORM_ID, inject, afterNextRender } from '@angular/core';

   export class MyComponent {
     private readonly platformId = inject(PLATFORM_ID);
     readonly isBrowser = isPlatformBrowser(this.platformId);

     constructor() {
       // Safe browser-only execution after rendering
       afterNextRender(() => {
         const theme = localStorage.getItem('theme');
       });
     }
   }
   ```
3. **Avoid Content Mismatch**:
   Ensure initial SSR HTML output matches the initial client rendered DOM to prevent hydration errors.

---

## 7. Clean UI, Design System & Styling Rules

To deliver an exceptional, premium developer tool experience:

1. **Design Tokens & CSS Variables**:
   All colors, borders, typography, shadows, and spacing must use centralized CSS custom properties in `src/styles.scss` (or a designated tokens file). Never hardcode random hex values in component styles.
   - Dark theme default or sleek modern dual theme (Deep Slate / Cyberpunk / Clean Glass).
   - Crisp modern sans font (Inter, Roboto, or Outfit) with monospace (JetBrains Mono, Fira Code) for JSON displays.

2. **Component Encapsulation & Scoping**:
   - Use SCSS with BEM or modern scoped class names.
   - Do NOT use `::ng-deep` or `ViewEncapsulation.None` unless strictly overriding third-party library primitives, and document why.
   - Keep component SCSS lean and modular.

3. **Performance & Layout Shifts (CLS)**:
   - For images or icons, specify explicit dimensions or use `NgOptimizedImage`.
   - Use CSS `contain: content` or `content-visibility: auto` on massive JSON tree virtual scroll lists to maintain 60/120 FPS.

4. **Accessibility & Usability**:
   - Every interactive element (button, icon button, input, toggle) must have an accessible name (`aria-label`, `title`, or visible text).
   - Ensure high-contrast keyboard focus indicators (`:focus-visible`).
   - Use semantic HTML tags (`<main>`, `<header>`, `<nav>`, `<button>`, `<section>`).

---

## 8. Directory & File Organization Structure

Maintain the following folder structure as features expand:

```text
src/
├── app/
│   ├── core/                  # Global singletons, services, interceptors, error handling
│   │   ├── interceptors/      # Functional HTTP interceptors
│   │   ├── services/          # ThemeService, StorageService, Analytics
│   │   └── layout/            # Navbar, Sidebar, Footer shell components
│   │
│   ├── shared/                # Pure reusable UI components & helpers
│   │   ├── components/        # Button, Modal, Tooltip, Dropdown, JsonNode
│   │   ├── pipes/             # FileSizePipe, SafeHtmlPipe
│   │   ├── directives/        # ClickOutsideDirective, HotkeyDirective
│   │   └── utils/             # Formatters, tree traversal algorithms, validators
│   │
│   ├── features/              # Feature modules (lazy-loaded domain views)
│   │   ├── editor/            # JSON input, parsing, validation
│   │   ├── viewer/            # Interactive JSON Tree / Graph representation
│   │   ├── diff/              # Side-by-side JSON diff comparison
│   │   └── schema/            # Schema validation & generator
│   │
│   ├── app.config.ts          # Main client providers
│   ├── app.config.server.ts   # SSR server providers
│   ├── app.routes.ts          # Root routing configuration
│   └── app.ts                 # Root shell component
│
├── styles/                    # Global SCSS, tokens, resets, theme variables
└── styles.scss                # Global style entrypoint
```

### File Naming Convention:
- Components: `feature-name.component.ts`, `feature-name.component.html`, `feature-name.component.scss` (or matching project's flat naming convention `feature-name.ts`, `feature-name.html`, `feature-name.scss` consistently).
- Services: `service-name.service.ts`
- Models & Types: `model-name.model.ts`
- Tests: `*.spec.ts`

---

## 9. Code Quality & TypeScript Rules

1. **Strict Types**:
   - `noImplicitAny: true` is enforced. Never use `any`. Use `unknown`, generics, or dedicated interfaces/types for JSON data.
   - For unknown JSON payloads, use:
     ```typescript
     export type JsonPrimitive = string | number | boolean | null;
     export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
     export type JsonObject = { [key: string]: JsonValue };
     export type JsonArray = JsonValue[];
     ```
2. **Immutable State Updates**:
   - Always update signals immutably:
     ```typescript
     // ✅ DO
     this.items.update(list => [...list, newItem]);
     this.config.update(cfg => ({ ...cfg, indent: 4 }));

     // ❌ DON'T: Mutating in-place
     this.items().push(newItem);
     ```
3. **Pure Functions for Core Logic**:
   - JSON parsing, tree traversal, diffing, and formatting logic should be isolated in pure, testable utility functions with unit test coverage.
