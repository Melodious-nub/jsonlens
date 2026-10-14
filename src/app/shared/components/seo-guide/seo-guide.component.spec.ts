import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SeoGuideComponent } from './seo-guide.component';

describe('SeoGuideComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeoGuideComponent],
    }).compileComponents();
  });

  it('should instantiate and default to formatter content', () => {
    const fixture = TestBed.createComponent(SeoGuideComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.content().key).toBe('formatter');
    expect(comp.content().title).toContain('Formatter');
  });

  it('should render content for validator topic', () => {
    const fixture = TestBed.createComponent(SeoGuideComponent);
    fixture.componentRef.setInput('topic', 'validator');
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.content().key).toBe('validator');
    expect(comp.content().badge).toContain('Syntax Diagnostics');
  });

  it('should render content for typescript topic', () => {
    const fixture = TestBed.createComponent(SeoGuideComponent);
    fixture.componentRef.setInput('topic', 'typescript');
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.content().key).toBe('typescript');
    expect(comp.content().badge).toContain('Code Generation');
  });
});
