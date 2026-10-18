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
});
