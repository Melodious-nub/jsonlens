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

  it('should instantiate and compute diffs', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.diffItems().length).toBeGreaterThan(0);
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

  it('should adjust vertical split via double click reset and keyboard navigation', () => {
    const fixture = TestBed.createComponent(DiffLensComponent);
    const comp = fixture.componentInstance;

    comp.splitPercent.set(70);
    comp.onHeaderDblClick(new MouseEvent('dblclick'));
    expect(comp.splitPercent()).toBe(50);

    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(comp.splitPercent()).toBe(45);

    comp.onHeaderKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(comp.splitPercent()).toBe(50);
  });
});
