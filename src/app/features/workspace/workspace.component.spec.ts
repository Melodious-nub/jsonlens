import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { WorkspaceComponent } from './workspace.component';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { ToastService } from '../../core/services/toast.service';
import { TypeGenService } from '../../core/services/type-gen.service';
import { ExportService } from '../../core/services/export.service';

describe('WorkspaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        JsonEngineService,
        ToastService,
        TypeGenService,
        ExportService,
      ],
    }).compileComponents();
  });

  it('should instantiate with default code lens and 50% split', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.activeLens()).toBe('code');
    expect(comp.splitPercent()).toBe(50);
  });

  it('should switch lens tabs', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.setLens('tree');
    expect(comp.activeLens()).toBe('tree');
    comp.setLens('type');
    expect(comp.activeLens()).toBe('type');
    comp.setLens('diff');
    expect(comp.activeLens()).toBe('diff');
  });

  it('should reset split to 50%', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.splitPercent.set(70);
    expect(comp.splitPercent()).toBe(70);
    comp.resetSplit();
    expect(comp.splitPercent()).toBe(50);
  });
});
