import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AboutPageComponent } from './about-page.component';

describe('AboutPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should instantiate and display features and faqs', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.features.length).toBeGreaterThanOrEqual(6);
    expect(comp.faqs.length).toBeGreaterThanOrEqual(4);
  });
});
