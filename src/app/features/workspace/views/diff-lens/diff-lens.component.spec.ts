import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DiffLensComponent } from './diff-lens.component';
import { JsonEngineService } from '../../../../core/services/json-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DiffService } from '../../../../core/services/diff.service';

describe('DiffLensComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffLensComponent],
      providers: [JsonEngineService, ToastService, DiffService],
    }).compileComponents();
  });

  it('should instantiate with identical sample data and detect diffs when modified', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.diffItems().length).toBeGreaterThan(0);
    expect(comp.meaningfulDiffs().length).toBe(0);

    comp.diff.setSecondaryInput('{"name": "JsonLens", "modified": true}');
    expect(comp.meaningfulDiffs().length).toBeGreaterThan(0);
  });

  it('should swap inputs correctly', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    const initialPrimary = comp.engine.rawInput();
    const initialSecondary = comp.secondaryInput();

    comp.swapInputs();

    expect(comp.engine.rawInput()).toBe(initialSecondary);
    expect(comp.secondaryInput()).toBe(initialPrimary);
  });

  it('should clear secondary input', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.clearSecondary();
    expect(comp.secondaryInput()).toBe('');
  });

  it('should collapse and expand differences drawer via double-click, pointer double-tap, and keyboard navigation', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.splitPercent.set(70);
    expect(comp.isCollapsed()).toBe(false);

    // Double click to collapse drawer to 0% (splitPercent = 100)
    comp.onHeaderDblClick(new MouseEvent('dblclick'));
    expect(comp.splitPercent()).toBe(100);
    expect(comp.isCollapsed()).toBe(true);

    // Double click to expand drawer back to 50% shortcut
    comp['lastToggleTime'] = 0;
    comp.onHeaderDblClick(new MouseEvent('dblclick'));
    expect(comp.splitPercent()).toBe(50);
    expect(comp.isCollapsed()).toBe(false);

    // Keyboard ArrowUp expands drawer (decreases top editor percent by 5)
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(comp.splitPercent()).toBe(45);

    // Keyboard ArrowDown collapses drawer (increases top editor percent by 5)
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(comp.splitPercent()).toBe(50);

    // Keyboard Enter / Space toggles collapse
    comp['lastToggleTime'] = 0;
    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(comp.splitPercent()).toBe(100);
    expect(comp.isCollapsed()).toBe(true);

    // Pointer double-tap toggles back to 50%
    comp['lastToggleTime'] = 0;
    comp['lastHeaderTapTime'] = Date.now() - 100;
    comp.onHeaderPointerUp(new PointerEvent('pointerup'));
    expect(comp.splitPercent()).toBe(50);
    expect(comp.isCollapsed()).toBe(false);
  });

  it('should not render the removed comparison editor heading bar', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor-header')).toBeNull();
  });

  it('should format secondary input when formatSecondary is called', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.diff.setSecondaryInput('{"key":"value"}');
    comp.formatSecondary();
    expect(comp.secondaryInput()).toBe('{\n  "key": "value"\n}');
  });

  it('should render Format, Swap, Open File, and Clear buttons in the diff actions header', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.diff-lens__actions button')
    ) as HTMLButtonElement[];
    const buttonTexts = buttons.map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Format');
    expect(buttonTexts).toContain('Swap');
    expect(buttonTexts).toContain('Open File');
    expect(buttonTexts).toContain('Clear');
  });
});
