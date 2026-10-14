import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { LensPageComponent } from './lens-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { ToastService } from '../../core/services/toast.service';
import { TypeGenService } from '../../core/services/type-gen.service';
import { ExportService } from '../../core/services/export.service';

describe('LensPageComponent', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
      class MockObserver implements IntersectionObserver {
        readonly root: Element | Document | null = null;
        readonly rootMargin: string = '';
        readonly scrollMargin: string = '';
        readonly thresholds: ReadonlyArray<number> = [];
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      }
      Object.defineProperty(window, 'IntersectionObserver', {
        writable: true,
        configurable: true,
        value: MockObserver,
      });
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LensPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ seoKey: 'validator', defaultLens: 'code' }),
          },
        },
        SeoService,
        JsonEngineService,
        ToastService,
        TypeGenService,
        ExportService,
      ],
    }).compileComponents();
  });

  it('should instantiate and resolve route data', () => {
    const fixture = TestBed.createComponent(LensPageComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.seoKey()).toBe('validator');
    expect(comp.defaultLens()).toBe('code');
  });
});
