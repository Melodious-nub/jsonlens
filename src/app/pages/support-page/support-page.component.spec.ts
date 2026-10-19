import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { SupportPageComponent } from './support-page.component';

describe('SupportPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should instantiate cleanly and contain planned support channels and guarantees', () => {
    const fixture = TestBed.createComponent(SupportPageComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.plannedChannels.length).toBeGreaterThanOrEqual(4);
    expect(comp.guarantees.length).toBeGreaterThanOrEqual(3);

    const titles = comp.plannedChannels.map((c) => c.title);
    expect(titles.some((t) => t.includes('Micro-Donations'))).toBe(true);
    expect(titles.some((t) => t.includes('GitHub Sponsors'))).toBe(true);
  });
});
