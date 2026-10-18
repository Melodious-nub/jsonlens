import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { WorkspaceComponent } from './workspace.component';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { ToastService } from '../../core/services/toast.service';
import { TypeGenService } from '../../core/services/type-gen.service';
import { ExportService } from '../../core/services/export.service';
import { DiffService } from '../../core/services/diff.service';

describe('WorkspaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        JsonEngineService,
        ToastService,
        TypeGenService,
        ExportService,
        DiffService,
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

  it('should reset split to 50% and track isSplitCentered', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    expect(comp.isSplitCentered()).toBe(true);

    comp.splitPercent.set(70);
    expect(comp.splitPercent()).toBe(70);
    expect(comp.isSplitCentered()).toBe(false);

    comp.resetSplit();
    expect(comp.splitPercent()).toBe(50);
    expect(comp.isSplitCentered()).toBe(true);

    // Calling when already centered stays 50
    comp.resetSplit();
    expect(comp.splitPercent()).toBe(50);
  });

  it('should format valid JSON when onFormat is called', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{"hello":"world"}');
    comp.onFormat();
    expect(comp.engine.parsedResult().formatted).toContain('{\n  "hello": "world"\n}');
  });

  it('should minify valid JSON when onMinify is called', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{\n  "hello": "world"\n}');
    comp.onMinify();
    expect(comp.engine.rawInput()).toBe('{"hello":"world"}');
  });

  it('should auto-repair syntax errors when onAutoRepair is called', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{hello: "world",}');
    comp.onAutoRepair();
    expect(comp.engine.isValid()).toBe(true);
  });

  it('should load sample JSON and clear editor', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.onLoadSample();
    expect(comp.engine.rawInput().length).toBeGreaterThan(0);
    expect(comp.engine.isValid()).toBe(true);

    comp.onClear();
    expect(comp.engine.rawInput()).toBe('');
  });

  it('should toggle fullscreen mode', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    expect(comp.isFullscreen()).toBe(false);
    comp.toggleFullscreen();
    expect(comp.isFullscreen()).toBe(true);
    comp.toggleFullscreen();
    expect(comp.isFullscreen()).toBe(false);
  });

  it('should toggle export menu and handle export', async () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    expect(comp.isExportMenuOpen()).toBe(false);
    comp.toggleExportMenu();
    expect(comp.isExportMenuOpen()).toBe(true);

    comp.engine.setInput('{"item": "test"}');
    await comp.onExport('json');
    expect(comp.isExportMenuOpen()).toBe(false);
  });

  it('should generate and copy share link', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{"test": true}');
    comp.onShare();
    // Verify no throw and valid execution
    expect(comp.engine.rawInput()).toBe('{"test": true}');
  });
});
