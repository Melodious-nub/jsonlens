import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceComponent } from './workspace.component';
import { JsonEngineService } from '../../core/services/json-engine.service';
import { ToastService } from '../../core/services/toast.service';
import { TypeGenService } from '../../core/services/type-gen.service';
import { ExportService } from '../../core/services/export.service';
import { DiffService } from '../../core/services/diff.service';
import { UrlShareService } from '../../core/services/url-share.service';

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
        UrlShareService,
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

  it('should open share dialog, generate payload metrics, and copy share link', async () => {
    const exportService = TestBed.inject(ExportService);
    vi.spyOn(exportService, 'copyToClipboard').mockResolvedValue(true);

    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    comp.engine.setInput('{\n  "name": "JsonLens",\n  "status": "ready"\n}');

    expect(comp.isShareMenuOpen()).toBe(false);
    await comp.onToggleShare();

    expect(comp.isShareMenuOpen()).toBe(true);
    const data = comp.shareData();
    expect(data).not.toBeNull();
    expect(data!.originalBytes).toBeGreaterThan(0);
    expect(data!.compressedBytes).toBeGreaterThan(0);

    await comp.copyShareUrl();
    expect(comp.isShareCopied()).toBe(true);

    comp.closeShareMenu();
    expect(comp.isShareMenuOpen()).toBe(false);
  });

  it('should support 100% client-side share payload, in-place zoomable QR viewer, and download', async () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    const urlShareService = TestBed.inject(UrlShareService);
    const downloadSpy = vi.spyOn(urlShareService, 'downloadQrCodeImage').mockImplementation(() => {});

    comp.engine.setInput('{"qr": true}');
    await comp.onToggleShare();

    // Default compact state: QR preview is hidden by default
    expect(comp.showQrCode()).toBe(false);
    expect(comp.shareData()?.url).toContain('#d=');

    // Click View to open QR in place
    await comp.onViewQr();
    expect(comp.isQrPreviewOpen()).toBe(true);
    expect(comp.showQrCode()).toBe(true);
    expect(comp.qrCodeDataUrl()).toBeTruthy();
    expect(comp.qrCodePngUrl()).toBeTruthy();

    // Download QR Code PNG
    await comp.downloadQrImage();
    expect(downloadSpy).toHaveBeenCalled();

    // Close previewer
    comp.closeQrPreview();
    expect(comp.isQrPreviewOpen()).toBe(false);
    expect(comp.showQrCode()).toBe(false);
  });

  it('should handle global keyboard shortcuts (Alt+F, Alt+M, Alt+R, Ctrl+F)', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const formatSpy = vi.spyOn(comp, 'onFormat');
    const minifySpy = vi.spyOn(comp, 'onMinify');
    const repairSpy = vi.spyOn(comp, 'onAutoRepair');
    const findSpy = vi.spyOn(comp, 'onTriggerFind');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', altKey: true }));
    expect(formatSpy).toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', altKey: true }));
    expect(minifySpy).toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', altKey: true }));
    expect(repairSpy).toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    expect(findSpy).toHaveBeenCalled();
  });

  it('should track activePane separately and trigger separate search on input vs output', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.activePane()).toBe('input');

    comp.setActivePane('output');
    expect(comp.activePane()).toBe('output');

    comp.setActivePane('input');
    expect(comp.activePane()).toBe('input');

    comp.setLens('tree');
    expect(comp.activePane()).toBe('output');
    expect(comp.activeLens()).toBe('tree');
  });

  it('should manage mobile responsive drawer state and toggle panes', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.mobilePane()).toBe('input');

    comp.toggleMobilePane();
    expect(comp.mobilePane()).toBe('output');
    expect(comp.activePane()).toBe('output');

    comp.toggleMobilePane();
    expect(comp.mobilePane()).toBe('input');
    expect(comp.activePane()).toBe('input');

    comp.setMobilePane('output');
    expect(comp.mobilePane()).toBe('output');

    comp.setMobilePane('input');
    expect(comp.mobilePane()).toBe('input');
  });

  it('should switch mobile pane via toolbar toggle and setMobilePane', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.mobilePane()).toBe('input');

    // Toggle to output pane via toolbar arrow
    comp.toggleMobilePane();
    expect(comp.mobilePane()).toBe('output');

    // Toggle back to input pane via toolbar arrow
    comp.toggleMobilePane();
    expect(comp.mobilePane()).toBe('input');

    // Explicit pane selection
    comp.setMobilePane('output');
    expect(comp.mobilePane()).toBe('output');
    comp.setMobilePane('input');
    expect(comp.mobilePane()).toBe('input');
  });
  it('should dismiss export menu and share menu on Escape key', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    // 1. Export menu dismiss
    comp.isExportMenuOpen.set(true);
    expect(comp.isExportMenuOpen()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp.isExportMenuOpen()).toBe(false);

    // 2. Share menu dismiss
    comp.isShareMenuOpen.set(true);
    expect(comp.isShareMenuOpen()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(comp.isShareMenuOpen()).toBe(false);
  });
});
